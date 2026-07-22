<?php

namespace appfoster\upsnap\records;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use appfoster\upsnap\Constants;

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
class SettingRecord extends Model
{
    protected $table = 'upsnap_settings';

    const CREATED_AT = 'dateCreated';
    const UPDATED_AT = 'dateUpdated';

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->uid)) {
                $model->uid = Str::uuid()->toString();
            }
        });
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
        return self::where('key', $key)->first();
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