<script setup lang="ts">
import { computed } from 'vue'

/**
 * A slow ribbon of words. The track is doubled so the loop is seamless and
 * the speed is set from the number of items so long and short ribbons move
 * at the same pace. Pauses under reduced motion (the words still read).
 */
const props = withDefaults(
  defineProps<{ items: string[]; seconds?: number; reverse?: boolean; separator?: 'dot' | 'slash' | 'rule' | 'none' }>(),
  { seconds: 0, reverse: false, separator: 'dot' },
)
const duration = computed(() => (props.seconds || props.items.length * 5.5) + 's')
</script>

<template>
  <div class="ap-marquee" :class="[{ 'is-reverse': reverse }, `ap-marquee--${separator}`]" aria-hidden="true">
    <div class="ap-marquee__track" :style="{ animationDuration: duration }">
      <span v-for="(item, i) in [...items, ...items]" :key="i" class="ap-marquee__item">
        <span class="ap-marquee__word">{{ item }}</span>
        <span class="ap-marquee__sep" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.ap-marquee {
  overflow: hidden;
  white-space: nowrap;
}
.ap-marquee__track {
  display: inline-flex;
  animation: ap-marquee-slide linear infinite;
  will-change: transform;
}
.is-reverse .ap-marquee__track { animation-direction: reverse; }
.ap-marquee__item {
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  padding-right: 0.6em;
}
.ap-marquee__sep {
  display: inline-block;
  width: 0.24em;
  height: 0.24em;
  background: currentColor;
  border-radius: 50%;
}
.ap-marquee--slash .ap-marquee__sep {
  width: 1px;
  height: 0.9em;
  border-radius: 0;
  transform: skewX(-18deg);
}
.ap-marquee--rule .ap-marquee__sep {
  width: 2em;
  height: 1px;
  border-radius: 0;
}
.ap-marquee--none .ap-marquee__sep { display: none; }
@keyframes ap-marquee-slide {
  to { transform: translate3d(-50%, 0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .ap-marquee__track { animation: none; }
}
</style>
