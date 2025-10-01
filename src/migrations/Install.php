<?php

namespace appfoster\upsnap\migrations;

use Craft;
use craft\db\Migration;
use appfoster\upsnap\Constants;

class Install extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        // Create the upsnap_settings table
        $this->createTables();

        // Create unique index on key
        $this->createIndexes();

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown(): bool
    {
        $this->dropTableIfExists(Constants::TABLE_SETTINGS);
        return true;
    }

    /**
     * Create custom tables needed by the plugin
     */
    private function createTables()
    {
        $tableSchema = $this->getTableSchema(Constants::TABLE_SETTINGS);
        if ($tableSchema === null) {
            $this->createTable(Constants::TABLE_SETTINGS, [
                'id' => $this->primaryKey(),
                'key' => $this->string(255)->notNull(),
                'value' => $this->text(),
                'dateCreated' => $this->dateTime()->notNull(),
                'dateUpdated' => $this->dateTime()->notNull(),
                'uid' => $this->uid(),
            ]);
        }
    }

    /**
     * Create indexes for the custom tables
     */
    private function createIndexes()
    {
        $this->createIndex(
            '{{%upsnap_settings_key}}',
            Constants::TABLE_SETTINGS,
            'key',
            true
        );
    }

    /**
     * Get the schema of a table
     */
    private function getTableSchema($tableName)
    {
        return Craft::$app->db->getSchema()->getTableSchema($tableName);
    }
}