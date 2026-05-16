FROM golang:1.25

# Install ffmpeg and yt-dlp
RUN apt-get update \
	&& apt-get install -y ffmpeg yt-dlp \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN go build -o aura ./main.go

# Create tmp directory for audio processing
RUN mkdir -p tmp

EXPOSE 8080

CMD ["./aura"]
