<?php

namespace App\Models;

use App\Enums\ExpenseType;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property ExpenseType $type
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read string $display_name
 * @property-read Collection<int, Period> $periods
 * @property-read Pivot|null $pivot
 * @property-read int|null $pivot_planned_amount
 * @property-read int|null $pivot_actual_amount
 */
class Expense extends Model
{
    public const DUPLICATE_SEPARATOR = '--';

    public const MAX_NAME_LENGTH = 255;

    protected $fillable = [
        'name',
        'type',
    ];

    protected $casts = [
        'type' => ExpenseType::class,
    ];

    public function periods(): BelongsToMany
    {
        return $this->belongsToMany(Period::class, 'period_expense')
            ->withPivot(['planned_amount', 'actual_amount', 'exclude_from_suggestions'])
            ->withTimestamps();
    }

    public function getDisplayNameAttribute(): string
    {
        return self::displayName($this->name);
    }

    public static function displayName(string $storedName): string
    {
        $displayName = preg_replace('/--\d+$/', '', $storedName);

        return $displayName ?? $storedName;
    }

    public static function displayKey(string $name): string
    {
        return mb_strtolower(trim(self::displayName($name)));
    }

    public static function storageKey(string $name): string
    {
        return mb_strtolower(trim($name));
    }

    public static function storageName(string $displayName, int $duplicateIndex = 0): string
    {
        $normalizedName = trim(self::displayName($displayName));
        $suffix = $duplicateIndex > 0
            ? self::DUPLICATE_SEPARATOR.$duplicateIndex
            : '';
        $maxBaseLength = max(0, self::MAX_NAME_LENGTH - strlen($suffix));
        $baseName = mb_substr($normalizedName, 0, $maxBaseLength);

        return $baseName.$suffix;
    }
}
