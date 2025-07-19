import { defineConfig } from 'vite';

export default defineConfig({
  // Build configuration for production optimization
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate source maps for debugging in production
    sourcemap: false,
    
    // Minify the output
    minify: 'terser',
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Terser options for better compression
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        safari10: true, // Fix Safari 10 issues
      },
    },
    
    // Rollup options for bundle optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Separate Three.js into its own chunk for better caching
          'three': ['three'],
          // Separate managers into their own chunk
          'managers': [
            './src/managers/AudioManager.ts',
            './src/managers/AssetManager.ts',
            './src/managers/InputManager.ts',
            './src/managers/PerformanceManager.ts',
            './src/managers/ScoreManager.ts',
            './src/managers/SettingsManager.ts'
          ],
        },
        // Optimize chunk file names for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // Target modern browsers for better optimization
    target: 'es2020',
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Asset inlining threshold (smaller assets will be inlined as base64)
    assetsInlineLimit: 4096,
  },
  
  // Server configuration for development
  server: {
    port: 3000,
    host: true, // Allow external connections
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
  },
  
  // Asset optimization
  assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif'],
  
  // Define global constants
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
  
  // CSS optimization
  css: {
    devSourcemap: false,
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: ['three'],
    exclude: [],
  },
});