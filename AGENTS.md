<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Fitting room is frontend-only: garments/size charts live in src/data/*.json and fit logic in src/lib/fit.ts (pure, tested) — no backend by brief.
- Mannequin rendering is isolated in src/components/Mannequin.tsx with props (body, outfit, view) so a GLB/3D renderer can replace it without touching the page.
- UI strings live in src/lib/i18n.ts per language; the page wrapper sets dir=rtl for Persian.
