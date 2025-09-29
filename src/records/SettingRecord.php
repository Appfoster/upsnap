<?php

namespace appfoster\upsnap\records;

use craft\db\ActiveRecord;

/**
 * Upsnap Setting Record
 *
 * @property int $id
 * @property string $key
 * @property string $value
 * @property string $dateCreated
 * @property string $dateUpdated
 * @property string $uid
 */
class SettingRecord extends ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName(): string
    {
        return '{{%upsnap_settings}}';
    }

    /**
     * @inheritdoc
     */
    public function rules(): array
    {
        return [
            [['key'], 'required'],
            [['key'], 'string', 'max' => 255],
            [['value'], 'string'],
            [['dateCreated', 'dateUpdated'], 'safe'],
            [['uid'], 'string', 'max' => 255],
            [['key'], 'unique'],
        ];
    }

    /**
     * @inheritdoc
     */
    public function attributeLabels(): array
    {
        return [
            'id' => 'ID',
            'key' => 'Key',
            'value' => 'Value',
            'dateCreated' => 'Date Created',
            'dateUpdated' => 'Date Updated',
            'uid' => 'UID',
        ];
    }

    /**
     * Find a setting by key
     */
    public static function findByKey(string $key): ?self
    {
        return self::findOne(['key' => $key]);
    }

    /**
     * Get the decoded value based on type
     */
    public function getDecodedValue()
    {
        $value = $this->value;

        // Try to decode JSON
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        // Check if it's a boolean string
        if ($value === '1' || $value === '0') {
            return (bool)$value;
        }

        // Check if it's numeric
        if (is_numeric($value)) {
            $intValue = (int)$value;
            $floatValue = (float)$value;
            return $intValue == $floatValue ? $intValue : $floatValue;
        }

        return $value;
    }

    /**
     * Set the encoded value
     */
    public function setEncodedValue($value): void
    {
        if ($value instanceof \DateTime) {
            $this->value = $value->format('Y-m-d H:i:s');
        } elseif (is_array($value) || is_object($value)) {
            $this->value = json_encode($value);
        } else {
            $this->value = (string)$value;
        }
    }
}