import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable } from "react-native";
import { companyToday, fmtDayDate, fmtDayDateY } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "./Button";
import { FieldFrame, useBoxStyle } from "./FieldFrame";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";
import { Text } from "./Text";

/*
 * A calendar day, "yyyy-MM-dd", as the API sends days. The phone's own picker shows it; the day is carried
 * through the picker at local noon so no time zone can move it to another day.
 */

const pad = (n: number) => String(n).padStart(2, "0");

function toPickerDate(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
}

function fromPickerDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type DateFieldProps = {
  label?: string;
  value: string | null;
  onChange: (day: string) => void;
  placeholder?: string;
  /** The earliest and latest days that can be picked, "yyyy-MM-dd". */
  minimumDay?: string;
  maximumDay?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  disabled?: boolean;
};

export function DateField({
  label,
  value,
  onChange,
  placeholder = "Pick a day",
  minimumDay,
  maximumDay,
  hint,
  error,
  optional,
  disabled,
}: DateFieldProps) {
  const { colors, scheme } = useTheme();
  const box = useBoxStyle(false, !!error, disabled);
  const [draft, setDraft] = useState<Date | null>(null);
  const limits = {
    minimumDate: minimumDay ? toPickerDate(minimumDay) : undefined,
    maximumDate: maximumDay ? toPickerDate(maximumDay) : undefined,
  };

  const open = () => {
    const start = toPickerDate(value ?? companyToday());
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: start,
        mode: "date",
        ...limits,
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
        accessibilityLabel={`${label ?? "Day"}: ${value ? fmtDayDateY(value) : "not set"}`}
        style={box}
      >
        <Icon name="calendar" size={18} color={colors.ink3} />
        <Text tone={value ? "default" : "muted"}>{value ? fmtDayDate(value) : placeholder}</Text>
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
              mode="date"
              display="inline"
              themeVariant={scheme}
              accentColor={colors.accent}
              {...limits}
              onChange={(_event, date) => date && setDraft(date)}
            />
          )}
        </Sheet>
      )}
    </FieldFrame>
  );
}
