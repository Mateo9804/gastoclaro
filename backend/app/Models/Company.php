<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory;
    protected $fillable = [
        'name', 
        'plan', 
        'user_limit', 
        'receipt_limit', 
        'tax_id', 
        'settings',
        'subscription_ends_at',
        'subscription_status',
        'pending_plan',
        'last_payment_at'
    ];
    
    protected $casts = [
        'settings' => 'array',
        'subscription_ends_at' => 'datetime',
        'last_payment_at' => 'datetime'
    ];

    public function users() { return $this->hasMany(User::class); }
}
