#!/usr/bin/env node
/**
 * Har bir to'g'ridan-to'g'ri bog'liqlikni `minimumReleaseAge` (7 kun) dan o'tgan, o'sha major
 * ichidagi eng yangi barqaror versiyaga qotiradi (07-quality-security.md §3).
 *
 *   node scripts/pin-mature-deps.mjs          # o'zgartiradi
 *   node scripts/pin-mature-deps.mjs --check  # faqat ko'rsatadi, farq bo'lsa exit 1
 *
 * Major yangilash — alohida qaror (Renovate PR), bu skript qilmaydi.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const AGE_MS = 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000; // + 1 soat zaxira
const cutoff = new Date(Date.now() - AGE_MS).toISOString();
const check = process.argv.includes('--check');
const STABLE = /^\d+\.\d+\.\d+$/;
const cache = new Map();

const times = (name) => {
  if (!cache.has(name)) {
    const out = execFileSync('npm', ['view', name, 'time', '--json'], { encoding: 'utf8' });
    const data = JSON.parse(out);
    cache.set(name, Array.isArray(data) ? data.at(-1) : data);
  }
  return cache.get(name);
};

const cmp = (a, b) => {
  const [x, y] = [a.split('.').map(Number), b.split('.').map(Number)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

const mature = (name, current) => {
  const major = current.split('.')[0];
  const candidates = Object.entries(times(name))
    .filter(([v, t]) => STABLE.test(v) && v.split('.')[0] === major && t < cutoff)
    .map(([v]) => v)
    .sort(cmp);
  return candidates.at(-1);
};

const manifests = ['package.json'];
for (const dir of ['apps', 'packages']) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name, 'package.json');
    if (existsSync(p)) manifests.push(p);
  }
}

let changed = 0;
for (const path of manifests) {
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  let dirty = false;
  for (const section of ['dependencies', 'devDependencies']) {
    for (const [name, version] of Object.entries(pkg[section] ?? {})) {
      if (!STABLE.test(version)) continue; // workspace:*, diapazonlar — tegilmaydi
      const next = mature(name, version);
      if (!next) {
        console.warn(`! ${path}: ${name}@${version} — major ichida 7 kunlik versiya yo'q`);
      } else if (next !== version) {
        console.info(`${path}: ${name} ${version} -> ${next}`);
        pkg[section][name] = next;
        dirty = true;
        changed += 1;
      }
    }
  }
  if (dirty && !check) writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.info(`cutoff ${cutoff} · ${changed} ta o'zgarish${check ? ' (check)' : ''}`);
if (check && changed > 0) process.exitCode = 1;
