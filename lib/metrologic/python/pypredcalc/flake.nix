{
  description = "pypredcalc — pure-math primitives for predication-native computation";

  # Python build via uv2nix: pyproject.toml + uv.lock drive the full
  # dep graph. Zero runtime deps by design (exact arithmetic via stdlib
  # fractions); the dev/test surface (pytest + hypothesis + sympy) is
  # picked up via workspace.deps.all for the flake check.
  #
  # https://pyproject-nix.github.io/uv2nix
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    pyproject-nix = {
      url = "github:pyproject-nix/pyproject.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    uv2nix = {
      url = "github:pyproject-nix/uv2nix";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    pyproject-build-systems = {
      url = "github:pyproject-nix/build-system-pkgs";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.uv2nix.follows = "uv2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs@{ self, nixpkgs, flake-utils, pyproject-nix, uv2nix, pyproject-build-systems, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        lib = pkgs.lib;
        python = pkgs.python313;

        workspace = uv2nix.lib.workspace.loadWorkspace {
          workspaceRoot = ./.;
        };

        uvOverlay = workspace.mkPyprojectOverlay {
          sourcePreference = "wheel";
        };

        pythonSet =
          (pkgs.callPackage pyproject-nix.build.packages {
            inherit python;
          }).overrideScope (lib.composeManyExtensions [
            pyproject-build-systems.overlays.default
            uvOverlay
          ]);

        pypredcalc = pythonSet.mkVirtualEnv
          "pypredcalc-${(lib.importTOML ./pyproject.toml).project.version}"
          workspace.deps.default;

        # Test env: default deps + optional-dep groups (the `dev` extra
        # → pytest + hypothesis; `symbolic` → sympy).
        pypredcalcTestEnv = pythonSet.mkVirtualEnv "pypredcalc-test-env"
          workspace.deps.all;

        pypredcalcPytest = pkgs.runCommand "pypredcalc-pytest"
          {
            nativeBuildInputs = [ pypredcalcTestEnv pkgs.git ];
          } ''
            cp -R ${./.} source
            chmod -R u+w source
            cd source
            export PATH="${pkgs.git}/bin:$PATH"
            export HOME=$TMPDIR
            pytest tests -q
            touch $out
          '';

      in {
        packages = {
          inherit pypredcalc;
          # Keep the legacy `pypred` alias so consumers that still
          # reference it via `.packages.${system}.pypred` don't break
          # mid-migration. Drop once all references read `pypredcalc`.
          pypred = pypredcalc;
          default = pypredcalc;
        };

        checks = {
          inherit pypredcalcPytest;
          default = pypredcalcPytest;
        };

        devShells.default = pkgs.mkShell {
          name = "pypredcalc-dev";
          packages = [
            pypredcalc
            pkgs.git
            pkgs.uv
          ];
          shellHook = ''
            echo "pypredcalc development shell"
            echo "  python: $(python --version)"
            echo "  uv:     $(uv --version)"
            echo "Run tests with: pytest tests -q"
          '';
        };
      });
}
