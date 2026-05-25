import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import base44 from '@base44/vite-plugin'
import obfuscator from 'vite-plugin-javascript-obfuscator'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [base44({
    // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
    // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
    legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
    hmrNotifier: true,
    navigationNotifier: true,
    analyticsTracker: true,
    visualEditAgent: true
  }), react(), obfuscator({
    include: [/\.(js|jsx|ts|tsx)$/],
    exclude: [/node_modules/],
    options: {
      compact: true,
      controlFlowFlattening: false,
      controlFlowFlatteningThreshold: 0,
      deadCodeInjection: false,
      deadCodeInjectionThreshold: 0,
      debugProtection: false,
      debugProtectionInterval: 0,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: false,
      renameGlobals: false,
      selfDefending: true,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayCallsTransformThreshold: 0.5,
      stringArrayEncoding: ['base64'],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 2,
      stringArrayWrappersChainedCalls: true,
      stringArrayWrappersParametersMaxCount: 4,
      stringArrayWrappersType: 'function',
      stringArrayThreshold: 0.5,
      transformObjectKeys: false,
      unicodeEscapeSequence: false
    }
  }), cloudflare()],
  build: {
    sourcemap: false, // Ensure no source maps are generated
  }
});