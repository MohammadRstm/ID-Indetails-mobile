import { useQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { CompanySettings } from "@/api/types";
import { setFormatSettings } from "@/format/time";

export const companySettingsKey = ["company", "settings"] as const;

/**
 * The company's settings. Loading them applies the time zone, the 24-hour clock and the week start to every
 * date and time the app formats, so they load before any signed-in screen, as on the web.
 */
export function useCompanySettings(options: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: companySettingsKey,
    queryFn: async () => {
      const { data } = await http.get<CompanySettings>("/company/settings");
      setFormatSettings({
        timeZone: data.timeZone,
        use24HourTime: data.use24HourTime,
        weekStart: data.weekStart,
      });
      return data;
    },
    staleTime: 5 * 60_000,
  });
}
