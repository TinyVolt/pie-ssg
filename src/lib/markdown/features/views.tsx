// The view part of every feature: runs in the browser. Each feature's build part is in `build.ts`.
import type { Component, JSX } from 'solid-js';
import type { FeatureData } from './build';
import { SidebarView } from './sidebar/View';

/** A feature's view: wraps the page, given the feature's data. */
type FeatureView<D> = Component<{ data: D; children: JSX.Element }>;

/** Every feature's view, by key, outermost first. */
const VIEWS: { [K in keyof FeatureData]-?: FeatureView<NonNullable<FeatureData[K]>> } = {
  sidebar: SidebarView,
};

/** `body` wrapped in the view of every feature that is on for the page, the first in `VIEWS` outermost. */
export function wrapPage(data: FeatureData, body: JSX.Element): JSX.Element {
  return (Object.entries(VIEWS) as [keyof FeatureData, FeatureView<unknown>][]).reduceRight<JSX.Element>(
    (inner, [key, View]) => (data[key] === undefined ? inner : <View data={data[key]}>{inner}</View>),
    body,
  );
}
