# Free Form Basketball Prototype

An isolated, static interaction prototype for the Outsmart Free Form basketball
reward concept.

**Public prototype:**
<https://outsmart-college.github.io/freeform-basketball-prototype/>

## GitHub Pages

The public site is deployed from `site/` by
`.github/workflows/deploy-pages.yml` whenever `main` changes. There is no build
step, package installation, runtime secret, or external service dependency.

The workflow uploads only the contents of `site/`. Repository documentation,
Git metadata, and workflow files are not included in the published artifact.

## Local preview

```sh
python3 -m http.server 8000 --directory site
```

Then open <http://127.0.0.1:8000/>.
