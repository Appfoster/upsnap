<?php

namespace appfoster\upsnap\migrations;

use Craft;
use craft\db\Migration;

/**
 * m250929_000000_create_upsnap_settings_table migration.
 */
class m250929_000000_create_upsnap_settings_table extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        // Create the upsnap_settings table
        $this->createTable('{{%upsnap_settings}}', [
            'id' => $this->primaryKey(),
            'key' => $this->string(255)->notNull(),
            'value' => $this->text(),
            'dateCreated' => $this->dateTime()->notNull(),
            'dateUpdated' => $this->dateTime()->notNull(),
            'uid' => $this->uid(),
        ]);

        // Create unique index on key
        $this->createIndex(
            '{{%upsnap_settings_key}}',
            '{{%upsnap_settings}}',
            'key',
            true
        );

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown(): bool
    {
        $this->dropTableIfExists('{{%upsnap_settings}}');
        return true;
    }
}