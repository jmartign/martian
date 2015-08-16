package main

import (
	"martian/core"
	"martian/manager"
	_ "os"
	"path"
	_ "path/filepath"
	_ "strings"
	"time"

	"github.com/docopt/docopt.go"
)

func main() {
	core.SetupSignalHandlers()
	doc := `Houston.

Usage:
    houston
    houston -h | --help | --version

Options:
    -h --help       Show this message.
    --version       Show version.`
	martianVersion := core.GetVersion()
	docopt.Parse(doc, nil, true, martianVersion, false)

	env := core.EnvRequire([][]string{
		{"HOUSTON_PORT", ">2000"},
		{"HOUSTON_INSTANCE_NAME", "displayed_in_ui"},
		{"HOUSTON_BUCKET", "s3_bucket"},
		{"HOUSTON_CACHE_PATH", "path/to/houston/cache"},
		{"HOUSTON_DOWNLOAD_PATH", "path/to/houston/downloads"},
		{"HOUSTON_LOGS_PATH", "path/to/houston/logs"},
		{"HOUSTON_FILES_PATH", "path/to/houston/files"},
		{"HOUSTON_EMAIL_HOST", "smtp.server.local"},
		{"HOUSTON_EMAIL_SENDER", "email@address.com"},
		{"HOUSTON_EMAIL_RECIPIENT", "email@address.com"},
	}, true)

	core.LogTee(path.Join(env["HOUSTON_LOGS_PATH"], time.Now().Format("20060102150405")+".log"))

	uiport := env["HOUSTON_PORT"]
	instanceName := env["HOUSTON_INSTANCE_NAME"]
	bucket := env["HOUSTON_BUCKET"]
	cachePath := env["HOUSTON_CACHE_PATH"]
	downloadPath := env["HOUSTON_DOWNLOAD_PATH"]
	filesPath := env["HOUSTON_FILES_PATH"]
	emailHost := env["HOUSTON_EMAIL_HOST"]
	emailSender := env["HOUSTON_EMAIL_SENDER"]
	emailRecipient := env["HOUSTON_EMAIL_RECIPIENT"]

	// Mailer
	mailer := manager.NewMailer(instanceName, emailHost, emailSender, emailRecipient, false)

	// Downloader
	dl := NewDownloadManager(bucket, downloadPath, filesPath, mailer)
	dl.StartDownloadLoop()

	// Runtime
	rt := core.NewRuntime("local", "disable", "disable", martianVersion)

	// PipestanceManager
	pman := NewPipestanceManager(rt, filesPath, cachePath)

	// Run web server.
	go runWebServer(uiport, martianVersion, pman)

	// Start pipestance manager daemon.
	pman.StartInventoryLoop()

	// Let daemons take over.
	done := make(chan bool)
	<-done
}
