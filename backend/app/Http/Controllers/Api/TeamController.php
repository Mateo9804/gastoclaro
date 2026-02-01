<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class TeamController extends Controller
{
    public function index()
    {
        $admin = Auth::user();
        
        if ($admin->role === 'super_admin') {
            // El Super Admin ve los administradores de todas las empresas
            $team = User::with('company')
                ->where('role', 'admin')
                ->orderBy('name', 'asc')
                ->get();
            return response()->json($team);
        }

        if ($admin->role !== 'admin') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $team = User::where('company_id', $admin->company_id)
            ->where('id', '!=', $admin->id)
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($team);
    }

    public function store(Request $request)
    {
        $admin = Auth::user();

        if ($admin->role === 'super_admin') {
            // Lógica para crear una nueva EMPRESA
            $request->validate([
                'name' => 'required|string|max:255', // Este es el nombre de la empresa para el Super Admin
                'password' => 'required|string|min:8',
                'plan' => 'required|string|in:basic,pro,enterprise',
            ]);

            // El email se genera automáticamente: nombreempresa@gastoclaro.com
            // Limpiamos el nombre para el email (minúsculas y sin espacios)
            $cleanName = strtolower(str_replace(' ', '', $request->name));
            $email = $cleanName . '@gastoclaro.com';

            // Verificar si el email ya existe
            if (User::where('email', $email)->exists()) {
                return response()->json(['message' => 'Ya existe una empresa con ese nombre (email duplicado)'], 422);
            }

            // Definir límites según el plan
            $userLimit = 3;
            $receiptLimit = 100;

            if ($request->plan === 'enterprise') {
                $userLimit = 20;
                $receiptLimit = 1500;
            } elseif ($request->plan === 'pro') {
                $userLimit = 10;
                $receiptLimit = 500;
            }

            // 1. Crear Empresa
            $company = \App\Models\Company::create([
                'name' => $request->name,
                'plan' => $request->plan,
                'user_limit' => $userLimit,
                'receipt_limit' => $receiptLimit,
                'subscription_ends_at' => \Carbon\Carbon::now()->addDays(30),
                'last_payment_at' => \Carbon\Carbon::now(),
                'subscription_status' => 'active',
            ]);

            // 2. Crear Usuario Admin para esa empresa
            $user = User::create([
                'name' => 'Admin ' . $request->name,
                'email' => $email,
                'password' => Hash::make($request->password),
                'company_id' => $company->id,
                'role' => 'admin',
            ]);

            return response()->json($user->load('company'), 201);
        }

        if ($admin->role !== 'admin') {
            return response()->json(['message' => 'Solo los administradores pueden crear miembros'], 403);
        }

        // Verificar límite de usuarios para la empresa (Admin + Límite)
        $userCount = User::where('company_id', $admin->company_id)->count();
        $limit = $admin->company->user_limit ?? 3;

        // El límite es de "miembros adicionales", por lo que permitimos (1 admin + $limit)
        if ($userCount > $limit) {
            return response()->json([
                'message' => 'Has alcanzado el límite de miembros adicionales para tu plan (' . $limit . ').'
            ], 422);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:admin,employee,accountant',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'company_id' => $admin->company_id,
            'role' => $request->role,
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user)
    {
        $admin = Auth::user();

        if ($admin->role === 'super_admin') {
            $request->validate([
                'name' => 'required|string|max:255',
                'password' => 'nullable|string|min:8',
                'plan' => 'required|string|in:basic,pro,enterprise',
            ]);

            // Definir límites según el plan
            $userLimit = 3;
            $receiptLimit = 100;

            if ($request->plan === 'enterprise') {
                $userLimit = 20;
                $receiptLimit = 1500;
            } elseif ($request->plan === 'pro') {
                $userLimit = 10;
                $receiptLimit = 500;
            }

            // Actualizar Empresa
            $user->company->update([
                'name' => $request->name,
                'plan' => $request->plan,
                'user_limit' => $userLimit,
                'receipt_limit' => $receiptLimit,
            ]);

            // Actualizar Usuario Admin (Email NO se cambia por ahora para evitar problemas de login)
            $userData = [
                'name' => 'Admin ' . $request->name,
            ];

            if ($request->password) {
                $userData['password'] = Hash::make($request->password);
            }

            $user->update($userData);

            return response()->json($user->load('company'));
        }

        if ($admin->role !== 'admin') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($user->company_id !== $admin->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'role' => 'required|string|in:admin,employee,accountant',
        ]);

        $userData = [
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
        ];

        if ($request->password) {
            $userData['password'] = Hash::make($request->password);
        }

        $user->update($userData);

        return response()->json($user);
    }

    public function destroy(User $user)
    {
        $admin = Auth::user();

        if ($admin->role === 'super_admin') {
            // El Super Admin puede eliminar empresas (usuarios admin)
            if ($user->role !== 'admin') {
                return response()->json(['message' => 'Solo se pueden eliminar administradores de empresas'], 403);
            }

            // Eliminar la empresa asociada (esto eliminará automáticamente todos los usuarios de la empresa por cascade)
            if ($user->company) {
                $user->company->delete();
            } else {
                // Si no hay empresa asociada, solo eliminamos el usuario
                $user->delete();
            }

            return response()->json(['message' => 'Empresa eliminada con éxito']);
        }

        if ($admin->role !== 'admin') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($user->company_id !== $admin->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'Usuario eliminado con éxito']);
    }
}
