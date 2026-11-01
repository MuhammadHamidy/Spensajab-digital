package version

import (
	"fmt"
	"runtime"
	"runtime/debug"
	"strings"
)

var (
	Version   = "dev"
	Commit    = "none"
	Branch    = "unknown"
	BuildTime = "unknown"
)

func Info() map[string]string {
	info := map[string]string{
		"version":    Version,
		"commit":     Commit,
		"branch":     Branch,
		"build_time": BuildTime,
		"go_version": runtime.Version(),
	}
	
	if bi, ok := debug.ReadBuildInfo(); ok && bi != nil {
		for _, s := range bi.Settings {
			switch s.Key {
			case "vcs.revision":
				if Commit == "none" && s.Value != "" {
					info["commit"] = s.Value
				}
			case "vcs.time":
				if BuildTime == "unknown" && s.Value != "" {
					info["build_time"] = s.Value
				}
			case "vcs.modified":
				// Optional: surface dirty tree
				if s.Value == "true" {
					info["dirty"] = "true"
				}
			}
		}
	}

	return info
}

func String() string {
	i := Info()
	var b strings.Builder
	_, _ = fmt.Fprintf(&b, "version:    %s\n", i["version"])
	_, _ = fmt.Fprintf(&b, "commit:     %s\n", i["commit"])
	_, _ = fmt.Fprintf(&b, "branch:     %s\n", i["branch"])
	_, _ = fmt.Fprintf(&b, "build time: %s\n", i["build_time"])
	_, _ = fmt.Fprintf(&b, "go:         %s\n", i["go_version"])
	if d, ok := i["dirty"]; ok {
		_, _ = fmt.Fprintf(&b, "dirty:      %s\n", d)
	}
	return b.String()
}
