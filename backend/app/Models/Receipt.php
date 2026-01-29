<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Receipt extends Model
{
    protected $fillable = [
        'user_id',
        'company_id',
        'file_path',
        'original_name',
        'status',
        'category',
        'vendor_name',
        'date',
        'total_amount',
        'currency',
        'ocr_text',
        'uploaded_by',
        'edited_by',
        'approved_by',
        'approved_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function uploader() { return $this->belongsTo(User::class, 'uploaded_by'); }
    public function editor() { return $this->belongsTo(User::class, 'edited_by'); }
    public function approver() { return $this->belongsTo(User::class, 'approved_by'); }
}
