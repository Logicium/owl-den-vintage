<script setup lang="ts">
import ShopOrderStatus from '@apotome/archetype-shared/components/commerce/ShopOrderStatus.vue'

defineProps<{ id: string }>()
</script>

<template>
  <ShopOrderStatus :order-id="id" shop-path="/shop" />
</template>
