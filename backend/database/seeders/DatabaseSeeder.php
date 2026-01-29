<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $company = \App\Models\Company::create([
            'name' => 'GestionClaro',
            'plan' => 'pro',
            'user_limit' => 10,
            'receipt_limit' => 500,
            'subscription_ends_at' => \Carbon\Carbon::now()->addDays(30),
            'last_payment_at' => \Carbon\Carbon::now(),
            'subscription_status' => 'active',
        ]);

        \App\Models\User::create([
            'company_id' => $company->id,
            'name' => 'Admin GastoClaro',
            'email' => 'admin@gastoclaro.com',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
            'role' => 'super_admin',
        ]);
    }
}
