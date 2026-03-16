import { Stack } from "expo-router";
import { DemoProvider } from "../../../lib/demo-context";
import { DEMO_MODE } from "../../../lib/demo-data";

function SharedStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        animation: "slide_from_right",
      }}
    />
  );
}

export default function SharedLayout() {
  if (DEMO_MODE) {
    return (
      <DemoProvider>
        <SharedStack />
      </DemoProvider>
    );
  }
  return <SharedStack />;
}
