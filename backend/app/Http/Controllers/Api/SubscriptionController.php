<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class SubscriptionController extends Controller
{
    public function getSubscription()
    {
        $user = Auth::user();
        $company = $user->company;

        return response()->json([
            'plan' => $company->plan,
            'status' => $company->subscription_status,
            'ends_at' => $company->subscription_ends_at,
            'pending_plan' => $company->pending_plan,
            'last_payment' => $company->last_payment_at,
        ]);
    }

    public function cancelSubscription()
    {
        $user = Auth::user();
        $company = $user->company;

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Solo los administradores pueden cancelar la suscripción.'], 403);
        }

        $company->update([
            'subscription_status' => 'cancelled',
            'pending_plan' => null // Cancelamos cualquier cambio de plan pendiente
        ]);

        return response()->json(['message' => 'Suscripción cancelada. Podrás seguir usando el servicio hasta el final de tu ciclo de facturación.']);
    }

    public function changePlan(Request $request)
    {
        $request->validate([
            'plan' => 'required|string|in:basic,pro,enterprise'
        ]);

        $user = Auth::user();
        $company = $user->company;
        $newPlan = $request->plan;
        $currentPlan = $company->plan;

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Solo los administradores pueden cambiar el plan.'], 403);
        }

        if ($newPlan === $currentPlan) {
            return response()->json(['message' => 'Ya te encuentras en este plan.'], 422);
        }

        // Lógica de Precios
        $discount = 0;
        $message = "";

        // Si es un UPGRADE (de basic a algo superior)
        if ($currentPlan === 'basic' && ($newPlan === 'pro' || $newPlan === 'enterprise')) {
            $discount = 20;
            $price = ($newPlan === 'pro') ? 49.99 : 79.99;
            $finalPrice = $price - $discount;
            
            // Aplicamos el cambio inmediatamente (Upgrade)
            $company->update([
                'plan' => $newPlan,
                'user_limit' => ($newPlan === 'pro' ? 10 : 20),
                'receipt_limit' => ($newPlan === 'pro' ? 500 : 1500),
                'subscription_status' => 'active',
                'subscription_ends_at' => Carbon::now()->addDays(30),
                'last_payment_at' => Carbon::now(),
                'pending_plan' => null
            ]);

            $message = "Plan actualizado a " . ucfirst($newPlan) . ". Se ha aplicado un descuento de 20€ por tu primer mes.";
        } 
        // Si es un DOWNGRADE o cambio entre Pro/Enterprise
        else {
            // Se queda programado para el siguiente mes
            $company->update([
                'pending_plan' => $newPlan,
                'subscription_status' => 'active' // Aseguramos que esté activa si estaba cancelada
            ]);
            $message = "Tu plan cambiará a " . ucfirst($newPlan) . " al finalizar tu ciclo actual de facturación.";
        }

        return response()->json([
            'message' => $message,
            'company' => $company
        ]);
    }

    public function renewSubscription()
    {
        $user = Auth::user();
        $company = $user->company;

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Solo los administradores pueden renovar.'], 403);
        }

        // Si tenía un plan pendiente, lo aplicamos ahora
        $planToApply = $company->pending_plan ?: $company->plan;
        
        $userLimit = 3;
        $receiptLimit = 100;
        if ($planToApply === 'enterprise') {
            $userLimit = 20;
            $receiptLimit = 1500;
        } elseif ($planToApply === 'pro') {
            $userLimit = 10;
            $receiptLimit = 500;
        }

        $company->update([
            'plan' => $planToApply,
            'user_limit' => $userLimit,
            'receipt_limit' => $receiptLimit,
            'subscription_status' => 'active',
            'subscription_ends_at' => Carbon::now()->addDays(30),
            'last_payment_at' => Carbon::now(),
            'pending_plan' => null
        ]);

        return response()->json(['message' => 'Suscripción renovada con éxito.']);
    }
}

