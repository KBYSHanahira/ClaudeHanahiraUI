import { expect, test } from 'claude-code/testing'
import pkg from '../.claude-plugin/plugin.json'
import { VERSION } from './version'

test('VERSION matches plugin.json', () => {
  expect(VERSION).toBe(pkg.version)
})
