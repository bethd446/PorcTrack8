#!/usr/bin/env python3
"""Apply v24 migration via Supabase Management API.

Usage: python3 scripts/apply_v24_migration.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_env():
    env = {}
    with open(os.path.join(ROOT, ".env.local")) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env[k] = v
    return env


def post_query(env, sql):
    payload = json.dumps({"query": sql}).encode()
    url = (
        f"https://api.supabase.com/v1/projects/"
        f"{env['SUPABASE_PROJECT_REF']}/database/query"
    )
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {env['SUPABASE_ACCESS_TOKEN']}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=120)
        return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def main():
    env = load_env()
    sql_path = os.path.join(
        ROOT, "migrations", "2026_05_02_v24_batch_sows_and_loges.sql"
    )
    sql = open(sql_path).read()
    code, body = post_query(env, sql)
    print("APPLY STATUS:", code)
    print("APPLY BODY:", body[:1000])
    if code >= 300:
        sys.exit(1)
    # Verify
    verify_sql = (
        "SELECT tablename FROM pg_tables WHERE schemaname='public' "
        "AND tablename IN ('batch_sows','loges','loge_movements') "
        "ORDER BY tablename;"
    )
    code, body = post_query(env, verify_sql)
    print("VERIFY STATUS:", code)
    print("VERIFY BODY:", body)


if __name__ == "__main__":
    main()
