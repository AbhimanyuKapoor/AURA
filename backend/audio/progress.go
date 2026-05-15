package audio

// Callback for emitting progress messages from pipelines
type Reportf func(format string, args ...any)

func (r Reportf) Printf(format string, args ...any) {
	if r == nil {
		return
	}
	r(format, args...)
}
