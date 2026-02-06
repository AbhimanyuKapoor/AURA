package audio

import "fmt"

// Song recognition pipeline using user audio
func RunRecognitionPipeline(rawPath string) error {
	_, meta, err := NormalizeAudio(rawPath, "tmp")
	if err != nil {
		return err
	}

	fmt.Printf("Normalized Audio, Metadata: %v\n", meta)

	return nil
}
