<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <label class="flex items-center justify-between cursor-pointer">
    <span class="text-sm text-gray-700">{{ label }}</span>
    <div class="relative">
      <input
        type="checkbox"
        :checked="modelValue"
        class="sr-only peer"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <div class="w-10 h-6 bg-gray-200/60 rounded-full peer-checked:bg-blue-500 transition-colors
        after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5
        after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:after:translate-x-4">
      </div>
    </div>
  </label>
</template>
