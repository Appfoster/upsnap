<?php

namespace appfoster\upsnap\migrations;

use CraftCms\Cms\Database\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class Install extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('upsnap_settings')) {
            Schema::create('upsnap_settings', function (Blueprint $table) {
                $table->integer('id', true);
                $table->string('key', 255)->unique('upsnap_settings_key');
                $table->text('value')->nullable();
                $table->dateTime('dateCreated');
                $table->dateTime('dateUpdated');
                $table->char('uid', 36)->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('upsnap_settings');
    }
}