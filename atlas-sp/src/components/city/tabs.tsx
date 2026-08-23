"use client";

import { LinkTabs } from "@/components/ui/tabs";
import { CITY_TABS } from "@/lib/city-tabs";

export function CityTabs({ slug, activeKey }: { slug: string; activeKey: string }) {
  return (
    <LinkTabs
      paramName="aba"
      activeKey={activeKey}
      tabs={CITY_TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        href: `/cidade/${slug}?aba=${tab.key}`,
      }))}
    />
  );
}
