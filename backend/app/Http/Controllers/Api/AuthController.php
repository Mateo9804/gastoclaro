<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function pricingRequest(Request $request)
    {
        $request->validate([
            'company_name' => 'required|string|max:255',
            'contact_email' => 'required|email',
            'plan' => 'required|string',
            'price' => 'required|string',
        ]);

        // Aquí se enviaría el email a mateovera9804@gmail.com
        // Por ahora lo registramos en los logs del sistema
        \Log::info("NUEVA SOLICITUD DE CUENTA GASTOCLARO:", [
            'empresa' => $request->company_name,
            'email' => $request->contact_email,
            'plan' => $request->plan,
            'precio' => $request->price,
            'mensaje' => $request->message ?? 'Sin comentarios adicionales',
            'destinatario' => 'mateovera9804@gmail.com'
        ]);

        return response()->json([
            'message' => 'Solicitud enviada con éxito. Nos pondremos en contacto pronto.'
        ]);
    }

    public function login(Request $request)
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Credenciales inválidas'], 401);
        }

        $user = User::with('company')->where('email', $request->email)->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'company' => $user->company->name,
                'company_id' => $user->company_id,
                'plan' => $user->company->plan,
                'user_limit' => $user->company->user_limit,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|string|min:8|confirmed',
        ], [
            'new_password.confirmed' => 'La confirmación de la nueva contraseña no coincide.',
            'new_password.min' => 'La nueva contraseña debe tener al menos 8 caracteres.'
        ]);

        $user = Auth::user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'La contraseña actual es incorrecta.'], 400);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }
}
