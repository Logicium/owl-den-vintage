<script setup lang="ts">
/**
 * SocialIconInput — a compact Lucide icon chooser for a social link. Stores the
 * icon's kebab name (e.g. "instagram") so the public template can map it back
 * to the matching icon. Searchable popover grid + a "None" option, inspired by
 * a custom Lucide chooser. Optional: leaving it blank just renders no icon.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ChevronDown, X, Search,
  Instagram, Facebook, Twitter, Youtube, Linkedin, Github, Twitch,
  Dribbble, Figma, Slack, Gitlab, Codepen, Music2, Send, MessageCircle,
  Rss, Globe, Mail, Phone, MapPin, Link as LinkIcon, Camera, Video,
  Music, Newspaper, ShoppingBag, Star, Heart,
} from 'lucide-vue-next'
import type { Component } from 'vue'

interface IconDef { name: string; label: string; comp: Component }

const ICONS: IconDef[] = [
  { name: 'instagram', label: 'Instagram', comp: Instagram },
  { name: 'facebook', label: 'Facebook', comp: Facebook },
  { name: 'twitter', label: 'Twitter / X', comp: Twitter },
  { name: 'youtube', label: 'YouTube', comp: Youtube },
  { name: 'tiktok', label: 'TikTok', comp: Music2 },
  { name: 'linkedin', label: 'LinkedIn', comp: Linkedin },
  { name: 'github', label: 'GitHub', comp: Github },
  { name: 'twitch', label: 'Twitch', comp: Twitch },
  { name: 'dribbble', label: 'Dribbble', comp: Dribbble },
  { name: 'figma', label: 'Figma', comp: Figma },
  { name: 'slack', label: 'Slack', comp: Slack },
  { name: 'gitlab', label: 'GitLab', comp: Gitlab },
  { name: 'codepen', label: 'CodePen', comp: Codepen },
  { name: 'telegram', label: 'Telegram', comp: Send },
  { name: 'whatsapp', label: 'WhatsApp / Chat', comp: MessageCircle },
  { name: 'rss', label: 'Blog / RSS', comp: Rss },
  { name: 'website', label: 'Website', comp: Globe },
  { name: 'email', label: 'Email', comp: Mail },
  { name: 'phone', label: 'Phone', comp: Phone },
  { name: 'map', label: 'Map / Location', comp: MapPin },
  { name: 'link', label: 'Link', comp: LinkIcon },
  { name: 'camera', label: 'Photos', comp: Camera },
  { name: 'video', label: 'Video', comp: Video },
  { name: 'music', label: 'Music', comp: Music },
  { name: 'news', label: 'News', comp: Newspaper },
  { name: 'shop', label: 'Shop', comp: ShoppingBag },
  { name: 'reviews', label: 'Reviews', comp: Star },
  { name: 'support', label: 'Support us', comp: Heart },
]

const props = defineProps<{ label?: string; hint?: string }>()
const model = defineModel<string>({ default: '' })

const open = ref(false)
const search = ref('')
const rootEl = ref<HTMLElement | null>(null)

const selected = computed(() => ICONS.find(i => i.name === model.value) ?? null)
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return ICONS
  return ICONS.filter(i => i.name.includes(q) || i.label.toLowerCase().includes(q))
})

function pick(name: string) { model.value = name; open.value = false; search.value = '' }
function clear() { model.value = ''; open.value = false }
function onDocClick(e: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div ref="rootEl" class="ai-field sii">
    <span v-if="label" class="ai-label">{{ label }}</span>
    <div style="position: relative">
      <button type="button" class="ai-control ai-select-trigger" :class="{ 'is-open': open }" @click="open = !open">
        <span class="sii__value">
          <component :is="selected.comp" v-if="selected" :size="17" />
          <span :class="{ 'is-placeholder': !selected }">{{ selected ? selected.label : 'Icon' }}</span>
        </span>
        <ChevronDown :size="15" class="ai-caret" />
      </button>
      <div v-if="open" class="ai-pop sii__pop">
        <div class="ai-pop__search">
          <Search :size="14" />
          <input v-model="search" placeholder="Search icons…" autofocus />
        </div>
        <div class="sii__grid">
          <button
            type="button"
            class="sii__opt sii__opt--none"
            :class="{ 'is-selected': !model }"
            title="No icon"
            @click="clear"
          ><X :size="16" /></button>
          <button
            v-for="i in filtered" :key="i.name"
            type="button"
            class="sii__opt"
            :class="{ 'is-selected': i.name === model }"
            :title="i.label"
            @click="pick(i.name)"
          ><component :is="i.comp" :size="17" /></button>
        </div>
        <p v-if="!filtered.length" class="ai-pop__empty">No icons match “{{ search }}”.</p>
      </div>
    </div>
    <span v-if="hint" class="ai-hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.sii__value { display: inline-flex; align-items: center; gap: 0.45rem; flex: 1; min-width: 0; padding: 0.4rem 0; }
.sii__value .is-placeholder { color: var(--adm-text-subtle); }
.sii__pop { min-width: 248px; }
.sii__grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.2rem; padding: 0.5rem; }
.sii__opt {
  display: grid; place-items: center;
  aspect-ratio: 1; padding: 0.4rem;
  background: none; border: 1px solid transparent; cursor: pointer;
  border-radius: var(--adm-radius-sm); color: var(--adm-text);
  transition: background 110ms ease, border-color 110ms ease, color 110ms ease;
}
.sii__opt:hover { background: var(--adm-surface-2); }
.sii__opt.is-selected { border-color: var(--adm-accent); color: var(--adm-accent); background: color-mix(in srgb, var(--adm-accent) 12%, transparent); }
.sii__opt--none { color: var(--adm-text-subtle); }
</style>
