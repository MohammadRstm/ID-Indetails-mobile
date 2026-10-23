import { Button, EmptyState, Screen, ScreenHeader } from "@/ui";

type WebsiteTodayViewProps = {
  name: string;
  onOpenWebsite: () => void;
};

/** What website staff see instead of a Today: the website is managed on the web. */
export function WebsiteTodayView({ name, onOpenWebsite }: WebsiteTodayViewProps) {
  return (
    <Screen header={<ScreenHeader title={`Hello, ${name}`} />}>
      <EmptyState
        art="done"
        title="The website is managed on the web"
        text="Projects, services, locations and contact details are edited in the Website area. Messages and alerts work here as usual."
        action={<Button label="Open the Website area" icon="external" onPress={onOpenWebsite} />}
      />
    </Screen>
  );
}
