<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Viewer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ViewerController extends Controller
{
    public function index(Request $request)
    {
        $links = Viewer::query()
            ->where('user_id', $request->user()->id)
            ->with(['viewer:id,name,email'])
            ->orderByDesc('created_at')
            ->get();

        $data = $links->map(function (Viewer $link) {
            return [
                'id' => $link->id,
                'viewer_id' => $link->viewer_id,
                'status' => $link->status,
                'viewer' => $link->viewer ? [
                    'id' => $link->viewer->id,
                    'name' => $link->viewer->name,
                    'email' => $link->viewer->email,
                ] : null,
                'created_at' => $link->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $data,
        ]);
    }

    public function sharedWithMe(Request $request)
    {
        $links = Viewer::query()
            ->where('viewer_id', $request->user()->id)
            ->where('status', Viewer::STATUS_ACTIVE)
            ->with(['user:id,name,email'])
            ->orderByDesc('created_at')
            ->get();

        $data = $links->map(function (Viewer $link) {
            return [
                'id' => $link->id,
                'user_id' => $link->user_id,
                'status' => $link->status,
                'user' => $link->user ? [
                    'id' => $link->user->id,
                    'name' => $link->user->name,
                    'email' => $link->user->email,
                ] : null,
                'created_at' => $link->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $data,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $viewer = User::query()->where('email', $data['email'])->first();

        if (!$viewer) {
            return response()->json([
                'message' => 'Такого пользователя нет.',
            ], 404);
        }

        if ($viewer->id === $request->user()->id) {
            return response()->json([
                'message' => 'Нельзя выдать доступ себе.',
            ], 422);
        }

        $existing = Viewer::query()
            ->where('user_id', $request->user()->id)
            ->where('viewer_id', $viewer->id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Доступ уже выдан этому пользователю.',
            ], 409);
        }

        $link = Viewer::create([
            'user_id' => $request->user()->id,
            'viewer_id' => $viewer->id,
            'status' => Viewer::STATUS_ACTIVE,
        ]);

        $link->load(['viewer:id,name,email']);

        return response()->json([
            'data' => [
                'id' => $link->id,
                'viewer_id' => $link->viewer_id,
                'status' => $link->status,
                'viewer' => [
                    'id' => $viewer->id,
                    'name' => $viewer->name,
                    'email' => $viewer->email,
                ],
                'created_at' => $link->created_at?->toISOString(),
            ],
        ], 201);
    }

    public function update(Request $request, Viewer $viewer)
    {
        if ($viewer->user_id !== $request->user()->id) {
            abort(403);
        }

        $data = $request->validate([
            'status' => [
                'required',
                Rule::in([Viewer::STATUS_ACTIVE, Viewer::STATUS_BLOCKED]),
            ],
        ]);

        $viewer->update([
            'status' => $data['status'],
        ]);

        return response()->json([
            'data' => [
                'id' => $viewer->id,
                'viewer_id' => $viewer->viewer_id,
                'status' => $viewer->status,
            ],
        ]);
    }

    public function destroy(Request $request, Viewer $viewer)
    {
        if ($viewer->user_id !== $request->user()->id) {
            abort(403);
        }

        $viewer->delete();

        return response()->json([
            'success' => true,
        ]);
    }
}
