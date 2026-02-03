<?php

namespace App\Enums;

enum ExpenseType: string
{
    case Mandatory = 'mandatory';
    case External = 'external';
    case Income = 'income';
}
