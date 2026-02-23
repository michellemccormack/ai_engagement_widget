# See Your Changes

## One command to see your changes

```bash
npm run go
```

That's it. Builds everything, starts the server, opens at **http://localhost:3000**.  
After you make edits, run `npm run go` again to see them.

---

## Faster option (if it works on your machine)

```bash
npm run dev
```

Then open http://localhost:3000. Changes may auto-refresh without re-running.

If you get "too many open files", run `ulimit -n 10240` once in your terminal first.
