#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'supabase-config.js');
const configSource = fs.readFileSync(configPath, 'utf8');

function readConfigValue(key, fallback) {
    const match = configSource.match(new RegExp(`${key}:\\s*'([^']+)'`));
    return match ? match[1] : fallback;
}

function normalizeArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }
    return [];
}

function normalizeText(value) {
    return String(value || '').trim();
}

function keyOf(property) {
    return property.id || property.number;
}

async function fetchApiProperties(apiBaseUrl) {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/properties`;
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache'
        }
    });
    if (!response.ok) {
        throw new Error(`API request failed: HTTP ${response.status} ${await response.text()}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('API response is not an array');
    return data;
}

async function fetchSupabaseProperties() {
    const supabaseUrl = process.env.SUPABASE_URL || readConfigValue('url', '');
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || readConfigValue('anonKey', '');
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase URL or anon key');

    const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await client
        .from('properties')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

function compare(apiProperties, supabaseProperties) {
    const errors = [];
    const warnings = [];
    const apiByKey = new Map(apiProperties.map((property) => [keyOf(property), property]));
    const supabaseByKey = new Map(supabaseProperties.map((property) => [keyOf(property), property]));

    if (apiProperties.length !== supabaseProperties.length) {
        errors.push(`Count mismatch: API=${apiProperties.length}, Supabase=${supabaseProperties.length}`);
    }

    for (const property of supabaseProperties) {
        const key = keyOf(property);
        const apiProperty = apiByKey.get(key);
        if (!apiProperty) {
            errors.push(`Missing from API: ${key} ${property.title || ''}`.trim());
            continue;
        }

        const requiredApiFields = ['id', 'title', 'type', 'address', 'price', 'layout', 'total_area'];
        for (const field of requiredApiFields) {
            if (!normalizeText(apiProperty[field])) {
                errors.push(`API property ${key} missing frontend field: ${field}`);
            }
        }

        const checks = [
            ['number', property.number, apiProperty.number],
            ['title', property.title, apiProperty.title],
            ['type', property.type, apiProperty.type],
            ['price', property.price, apiProperty.price],
            ['layout', property.layout, apiProperty.layout],
            ['total_area', property.total_area, apiProperty.total_area],
            ['status', property.status, apiProperty.status],
            ['statusText', property.status_text || property.statusText, apiProperty.statusText],
            ['updated_at', property.updated_at, apiProperty.updated_at]
        ];

        for (const [field, directValue, apiValue] of checks) {
            if (normalizeText(directValue) !== normalizeText(apiValue)) {
                errors.push(`Field mismatch for ${key}: ${field} Supabase="${normalizeText(directValue)}" API="${normalizeText(apiValue)}"`);
            }
        }

        const directImages = normalizeArray(property.images);
        const apiImages = normalizeArray(apiProperty.images);
        if (directImages.length !== apiImages.length) {
            errors.push(`Image count mismatch for ${key}: Supabase=${directImages.length}, API=${apiImages.length}`);
        }

        const directFeatures = normalizeArray(property.features);
        const apiFeatures = normalizeArray(apiProperty.features);
        if (directFeatures.length !== apiFeatures.length) {
            warnings.push(`Feature count differs for ${key}: Supabase=${directFeatures.length}, API=${apiFeatures.length}`);
        }

        if (property.google_maps && !apiProperty.google_maps) {
            errors.push(`Missing google_maps in API for ${key}`);
        }
    }

    for (const property of apiProperties) {
        const key = keyOf(property);
        if (!supabaseByKey.has(key)) {
            errors.push(`Extra API property not found in Supabase published set: ${key} ${property.title || ''}`.trim());
        }
    }

    return { errors, warnings };
}

async function main() {
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001/api';
    const [apiProperties, supabaseProperties] = await Promise.all([
        fetchApiProperties(apiBaseUrl),
        fetchSupabaseProperties()
    ]);

    const { errors, warnings } = compare(apiProperties, supabaseProperties);

    console.log(`API published properties: ${apiProperties.length}`);
    console.log(`Supabase published properties: ${supabaseProperties.length}`);
    warnings.forEach((warning) => console.warn(`WARN ${warning}`));

    if (errors.length > 0) {
        errors.forEach((error) => console.error(`FAIL ${error}`));
        process.exitCode = 1;
        return;
    }

    console.log('PASS Frontend API and Supabase published property data are in sync.');
}

main().catch((error) => {
    console.error(`FAIL ${error.message || error}`);
    process.exitCode = 1;
});
