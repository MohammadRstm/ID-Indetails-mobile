import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable } from "react-native";
import { fmtMinutes, formatSettings } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "./Button";
import { FieldFrame, useBoxStyle } from "./FieldFrame";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";
import { Text } from "./Text";

/*
 * A wall-clock time in the company's day, as minutes after midnight. The phone's picker only sees hours and
 * minutes, so the device's time zone never comes into it; the 12/24-hour clock follows the company setting.
 */

function toPickerDate(minutes: number): Date {
  const date = new Date(2000, 0, 1, 0, 0, 0, 0);
  date.setHours(Math.floor(minutes / 60), minutes % 60);
  return date;
}

const fromPickerDate = (date: Date) => date.getHours() * 60 + date.getMinutes();

type TimeFieldProps = {
  label?: string;
  /** Minutes after midnight, company time. */
  value: number | null;
  onChange: (minutes: number) => void;
  placeholder?: string;
  /** Minutes between choices on iOS (Android always offers every minute). */
  minuteInterval?: 1 | 5 | 15;
  hint?: string;
  error?: string;
  optional?: boolean;
  disabled?: boolean;
};

export function TimeField({
  label,
  value,
  onChange,
  placeholder = "Pick a time",
  minuteInterval = 5,
  hint,
  error,
  optional,
  disabled,
}: TimeFieldProps) {
  const { colors, scheme } = useTheme();
  const box = useBoxStyle(false, !!error, disabled);
  const [draft, setDraft] = useState<Date | null>(null);
  const is24Hour = formatSettings().use24HourTime;

  const open = () => {
    const start = toPickerDate(value ?? 9 * 60);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: start,
        mode: "time",
        is24Hour,
        onChange: (event, date) => {
          if (event.type === "set" && date) onChange(fromPickerDate(date));
        },
      });
    } else {
      setDraft(start);
    }
  };

  return (
    <FieldFrame label={label} hint={hint} error={error} optional={optional}>
      <Pressable
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? "Time"}: ${value == null ? "not set" : fmtMinutes(value)}`}
        style={box}
      >
        <Icon name="clock" size={18} color={colors.ink3} />
        <Text variant={value == null ? "body" : "mono"} tone={value == null ? "muted" : "default"}>
          {value == null ? placeholder : fmtMinutes(value)}
        </Text>
      </Pressable>
      {Platform.OS === "ios" && (
        <Sheet
          visible={draft !== null}
          onClose={() => setDraft(null)}
          title={label}
          footer={
            <Button
              label="Done"
              variant="primary"
              onPress={() => {
                if (draft) onChange(fromPickerDate(draft));
                setDraft(null);
              }}
            />
          }
        >
          {draft && (
            <DateTimePicker
              value={draft}
              mode="time"
              display="spinner"
              is24Hour={is24Hour}
              locale={is24Hour ? "en-GB" : "en-US"}
              minuteInterval={minuteInterval}
              themeVariant={scheme}
              onChange={(_event, date) => date && setDraft(date)}
            />
          )}
        </Sheet>
      )}
    </FieldFrame>
  );
}
