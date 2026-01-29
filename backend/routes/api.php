<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\SubscriptionController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

// Le agregamos ->name('login') para que Laravel sepa a dónde ir si hay error
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::post('/pricing-request', [AuthController::class, 'pricingRequest']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        $user = $request->user()->load('company');
        return [
            'id' => $user->id,
            'name' => $user->name,
            'company' => $user->company->name,
            'company_id' => $user->company_id,
            'plan' => $user->company->plan,
            'user_limit' => $user->company->user_limit,
            'email' => $user->email,
            'role' => $user->role,
        ];
    });

    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Suscripciones
    Route::get('/subscription', [SubscriptionController::class, 'getSubscription']);
    Route::post('/subscription/cancel', [SubscriptionController::class, 'cancelSubscription']);
    Route::post('/subscription/change-plan', [SubscriptionController::class, 'changePlan']);
    Route::post('/subscription/renew', [SubscriptionController::class, 'renewSubscription']);

    Route::get('/receipts', [ReceiptController::class, 'index']);
    Route::post('/receipts/upload', [ReceiptController::class, 'upload']);
    Route::put('/receipts/{receipt}', [ReceiptController::class, 'update']);
    Route::delete('/receipts/{receipt}', [ReceiptController::class, 'destroy']);
    Route::post('/receipts/{receipt}/approve', [ReceiptController::class, 'approve']);
    Route::post('/receipts/{receipt}/comments', [ReceiptController::class, 'addComment']);
    Route::get('/receipts/{receipt}/comments', [ReceiptController::class, 'getComments']);
    Route::delete('/comments/{comment}', [ReceiptController::class, 'destroyComment']);
    Route::get('/receipts/export', [ReceiptController::class, 'export']);

    // Rutas de Equipo
    Route::get('/team', [TeamController::class, 'index']);
    Route::post('/team', [TeamController::class, 'store']);
    Route::put('/team/{user}', [TeamController::class, 'update']);
    Route::delete('/team/{user}', [TeamController::class, 'destroy']);
});
