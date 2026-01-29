<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->timestamp('subscription_ends_at')->nullable()->after('receipt_limit');
            $table->string('subscription_status')->default('active')->after('subscription_ends_at'); // active, cancelled, expired
            $table->string('pending_plan')->nullable()->after('subscription_status');
            $table->timestamp('last_payment_at')->nullable()->after('pending_plan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['subscription_ends_at', 'subscription_status', 'pending_plan', 'last_payment_at']);
        });
    }
};
