<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class ReceiptController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Receipt::where('company_id', $user->company_id)
            ->with(['uploader', 'editor', 'approver'])
            ->withCount('comments');

        // Filtro por Estado
        if ($request->has('status') && $request->status != '') {
            $query->where('status', $request->status);
        }

        // Filtro por Categoría
        if ($request->has('category') && $request->category != '') {
            $query->where('category', $request->category);
        }

        // Filtro por Fecha (Soporta año, año-mes o fecha completa)
        if ($request->has('date') && $request->date != '') {
            $this->applyDateFilter($query, 'date', $request->date);
        }

        // Filtro por Fecha Subida (Soporta año, año-mes o fecha completa)
        if ($request->has('upload_date') && $request->upload_date != '') {
            $this->applyDateFilter($query, 'created_at', $request->upload_date);
        }

        // Ordenar
        $sort = $request->get('sort', 'newest');
        if ($sort == 'oldest') {
            $query->orderBy('created_at', 'asc');
        } elseif ($sort == 'amount_high') {
            $query->orderBy('total_amount', 'desc');
        } elseif ($sort == 'amount_low') {
            $query->orderBy('total_amount', 'asc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        return response()->json($query->get());
    }

    public function upload(Request $request)
    {
        $request->validate([
            'receipts' => 'required|array',
            'receipts.*' => 'required|file|mimes:jpeg,jpg,png,pdf|max:10240',
            'ocr_results' => 'nullable|array'
        ]);

        $user = Auth::user();
        $companyId = $user->company_id;

        if (!$companyId) {
            return response()->json(['message' => 'El usuario no pertenece a ninguna empresa'], 403);
        }

        // Verificar límite de tickets mensuales
        $company = $user->company;
        $receiptLimit = $company->receipt_limit ?? 100;
        $isPro = in_array($company->plan, ['pro', 'enterprise']);
        
        $startOfMonth = now()->startOfMonth();
        $endOfMonth = now()->endOfMonth();

        $receiptsCount = Receipt::where('company_id', $companyId)
            ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->count();

        $incomingCount = count($request->file('receipts'));

        if ($receiptsCount + $incomingCount > $receiptLimit) {
            return response()->json([
                'message' => 'Has alcanzado el límite de tickets mensuales para tu plan (' . $receiptLimit . ').'
            ], 422);
        }

        $results = [];
        $ocrResults = $request->input('ocr_results', []);

        foreach ($request->file('receipts') as $index => $file) {
            $path = $file->store('receipts/' . $companyId, 'public');

            $data = [
                'user_id' => $user->id,
                'company_id' => $companyId,
                'file_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'status' => 'pending',
                'uploaded_by' => $user->id,
                'date' => date('Y-m-d'), // Por defecto hoy
                'total_amount' => 0.00, // Por defecto 0
                'currency' => 'EUR',
                'vendor_name' => 'Proveedor por revisar'
            ];

            // Solo procesamos OCR si el frontend envió resultados Y el plan lo permite
            if ($isPro && isset($ocrResults[$index]) && $ocrResults[$index] !== null) {
                $ocr = $ocrResults[$index];
                $data['vendor_name'] = $ocr['vendor_name'] ?? 'Proveedor Desconocido';
                $data['total_amount'] = $ocr['total_amount'] ?? 0.00;
                $data['currency'] = $ocr['currency'] ?? 'EUR';
                $data['date'] = $ocr['date'] ?? date('Y-m-d');
                $data['status'] = 'completed'; 
                $data['ocr_text'] = $ocr['raw_text'] ?? null;
            }

            $results[] = Receipt::create($data);
        }

        return response()->json([
            'message' => 'Archivos procesados correctamente.',
            'receipts' => $results
        ], 201);
    }

    public function update(Request $request, Receipt $receipt)
    {
        $this->authorizeReceipt($receipt);
        $user = Auth::user();

        // Si es empleado, solo puede editar si está en pending o si él mismo lo subió
        if ($user->role === 'employee' && !in_array($receipt->status, ['pending', 'error'])) {
            return response()->json(['message' => 'No puedes editar un ticket ya procesado o aprobado.'], 403);
        }

        $validated = $request->validate([
            'vendor_name' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'total_amount' => 'nullable|numeric',
            'currency' => 'nullable|string|max:10',
            'status' => 'nullable|string|in:pending,processing,completed,error',
            'category' => 'nullable|string|max:100',
        ]);

        // Validaciones de negocio
        $warnings = $this->performBusinessValidations($validated, $receipt);

        $receipt->update(array_merge($validated, ['edited_by' => $user->id]));

        return response()->json([
            'message' => 'Recibo actualizado correctamente',
            'receipt' => $receipt,
            'warnings' => $warnings
        ]);
    }

    public function approve(Request $request, Receipt $receipt)
    {
        $this->authorizeReceipt($receipt);
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Solo los administradores pueden aprobar tickets.'], 403);
        }

        $receipt->update([
            'status' => 'completed',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'edited_by' => $user->id,
        ]);

        return response()->json(['message' => 'Ticket aprobado correctamente', 'receipt' => $receipt]);
    }

    public function destroy(Receipt $receipt)
    {
        $this->authorizeReceipt($receipt);
        $user = Auth::user();

        if ($user->role === 'accountant') {
            return response()->json(['message' => 'Los contadores no pueden eliminar tickets.'], 403);
        }

        Storage::disk('public')->delete($receipt->file_path);
        $receipt->delete();

        return response()->json(['message' => 'Recibo eliminado correctamente']);
    }

    public function addComment(Request $request, Receipt $receipt)
    {
        $this->authorizeReceipt($receipt);
        
        $request->validate(['comment' => 'required|string']);

        $comment = Comment::create([
            'receipt_id' => $receipt->id,
            'user_id' => Auth::id(),
            'comment' => $request->comment
        ]);

        return response()->json($comment->load('user'), 201);
    }

    public function getComments(Receipt $receipt)
    {
        $this->authorizeReceipt($receipt);
        return response()->json($receipt->comments()->with('user')->orderBy('created_at', 'asc')->get());
    }

    public function destroyComment(Comment $comment)
    {
        if ($comment->user_id !== Auth::id() && Auth::user()->role !== 'admin') {
            return response()->json(['message' => 'No puedes borrar este comentario'], 403);
        }

        $comment->delete();
        return response()->json(['message' => 'Comentario eliminado']);
    }

    public function export(Request $request)
    {
        $user = Auth::user();
        if (!in_array($user->role, ['admin', 'accountant'])) {
            return response()->json(['message' => 'No tienes permiso para exportar datos.'], 403);
        }

        $query = Receipt::where('company_id', $user->company_id)
            ->where('status', 'completed');

        // Aplicar los mismos filtros que en el index
        if ($request->has('category') && $request->category != '') {
            $query->where('category', $request->category);
        }

        if ($request->has('date') && $request->date != '') {
            $this->applyDateFilter($query, 'date', $request->date);
        }

        if ($request->has('upload_date') && $request->upload_date != '') {
            $this->applyDateFilter($query, 'created_at', $request->upload_date);
        }

        $receipts = $query->orderBy('date', 'desc')->get();

        $csvFileName = 'reporte_gastos_' . now()->format('Y-m-d') . '.csv';
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$csvFileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['ID', 'Proveedor', 'Fecha Factura', 'Fecha Subida', 'Monto', 'Moneda', 'Categoría', 'Subido Por'];

        $callback = function() use($receipts, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($receipts as $receipt) {
                fputcsv($file, [
                    $receipt->id,
                    $receipt->vendor_name,
                    $receipt->date,
                    $receipt->created_at->format('Y-m-d H:i:s'),
                    $receipt->total_amount,
                    $receipt->currency,
                    $receipt->category,
                    $receipt->uploader->name ?? 'N/A'
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function applyDateFilter($query, $column, $value)
    {
        if (strlen($value) === 4) { // Solo año
            $query->whereYear($column, $value);
        } elseif (strlen($value) === 7) { // Año-Mes
            $parts = explode('-', $value);
            $query->whereYear($column, $parts[0])
                  ->whereMonth($column, $parts[1]);
        } else { // Fecha completa
            $query->whereDate($column, $value);
        }
    }

    private function authorizeReceipt(Receipt $receipt)
    {
        $user = Auth::user();
        if (!$user || $receipt->company_id !== $user->company_id) {
            abort(403, 'No tienes permiso para acceder a este recurso.');
        }
    }

    private function performBusinessValidations($data, $receipt)
    {
        $warnings = [];

        // 1. Fecha futura
        if (isset($data['date']) && Carbon::parse($data['date'])->isFuture()) {
            $warnings[] = "La fecha del ticket es futura.";
        }

        // 2. Monto inusualmente alto (ejemplo: > 5000)
        if (isset($data['total_amount']) && $data['total_amount'] > 5000) {
            $warnings[] = "El monto es inusualmente alto ($" . $data['total_amount'] . ").";
        }

        // 3. Posible duplicado (mismo proveedor, monto y fecha)
        if (isset($data['vendor_name'], $data['total_amount'], $data['date'])) {
            $duplicate = Receipt::where('company_id', $receipt->company_id)
                ->where('id', '!=', $receipt->id)
                ->where('vendor_name', $data['vendor_name'])
                ->where('total_amount', $data['total_amount'])
                ->whereDate('date', $data['date'])
                ->exists();
            
            if ($duplicate) {
                $warnings[] = "Ya existe otro ticket registrado con el mismo proveedor, monto y fecha.";
            }
        }

        return $warnings;
    }
}
