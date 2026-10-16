import { expect, test } from 'bun:test'
import pkg from '../.claude-plugin/plugin.json'
import { VERSION } from './version'

test('VERSION matches plugin.json', () => {
  expect(VERSION).toBe(pkg.version)
})
