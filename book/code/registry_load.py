def load_package(folder: Path) -> LoadedModel:
    manifest = json.loads((folder / "manifest.json").read_text())
    artifact = folder / manifest["artifact"]["file"]
    if _sha256(artifact) != manifest["artifact"]["sha256"]:
        raise ModelLoadError(f"{folder}: artifact hash mismatch (file changed or corrupted)")
    if os.getenv("ALLOW_VERSION_MISMATCH") != "1":
        for lib, wanted in manifest.get("libraries", {}).items():
            if lib not in ENFORCED_LIBS:
                continue
            try:
                have = metadata.version(lib)
            except metadata.PackageNotFoundError:
                raise ModelLoadError(f"{folder}: needs {lib}=={wanted}, not installed")
            if _major_minor(have) != _major_minor(wanted):
                raise ModelLoadError(f"{folder}: trained with {lib} {wanted}, installed {have}")
    return LoadedModel(manifest, joblib.load(artifact))  # only ever load artifacts YOUR team built
