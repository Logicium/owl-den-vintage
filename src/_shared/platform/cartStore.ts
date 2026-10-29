/**
 * Storefront carts. The shop (Vault) and meal ordering (Mesa) each keep one,
 * shared between the catalog page that fills it and the /checkout page that
 * empties it, and persisted so a refresh or a bounce through the payment
 * provider does not lose it.
 */
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export interface ShopCartLine { productId: string; quantity: number }
export interface MealCartLine { menuItemId: string; quantity: number; notes?: string }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as T
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function persist(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode: in-memory only */ }
}

export const useShopCart = defineStore('shopCart', () => {
  const lines = ref<ShopCartLine[]>(read('ap-shop-cart', []))
  watch(lines, v => persist('ap-shop-cart', v), { deep: true })

  const count = computed(() => lines.value.reduce((n, l) => n + l.quantity, 0))

  function add(productId: string, quantity = 1) {
    const existing = lines.value.find(l => l.productId === productId)
    if (existing) existing.quantity += quantity
    else lines.value.push({ productId, quantity })
  }
  function setQuantity(productId: string, quantity: number) {
    if (quantity <= 0) { remove(productId); return }
    const existing = lines.value.find(l => l.productId === productId)
    if (existing) existing.quantity = quantity
    else lines.value.push({ productId, quantity })
  }
  function remove(productId: string) {
    lines.value = lines.value.filter(l => l.productId !== productId)
  }
  function clear() { lines.value = [] }

  return { lines, count, add, setQuantity, remove, clear }
})

export const useMealCart = defineStore('mealCart', () => {
  const lines = ref<MealCartLine[]>(read('ap-meal-cart', []))
  watch(lines, v => persist('ap-meal-cart', v), { deep: true })

  const count = computed(() => lines.value.reduce((n, l) => n + l.quantity, 0))

  function add(menuItemId: string, quantity = 1) {
    const existing = lines.value.find(l => l.menuItemId === menuItemId)
    if (existing) existing.quantity += quantity
    else lines.value.push({ menuItemId, quantity })
  }
  function setQuantity(menuItemId: string, quantity: number) {
    if (quantity <= 0) { remove(menuItemId); return }
    const existing = lines.value.find(l => l.menuItemId === menuItemId)
    if (existing) existing.quantity = quantity
    else lines.value.push({ menuItemId, quantity })
  }
  function setNotes(menuItemId: string, notes: string) {
    const existing = lines.value.find(l => l.menuItemId === menuItemId)
    if (existing) existing.notes = notes.trim() || undefined
  }
  function remove(menuItemId: string) {
    lines.value = lines.value.filter(l => l.menuItemId !== menuItemId)
  }
  function clear() { lines.value = [] }

  return { lines, count, add, setQuantity, setNotes, remove, clear }
})

export function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}
