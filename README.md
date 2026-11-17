# Tabrec Studio

Your vocal booth in a browser.


Extract this entire ZIP into its own folder, then double-click Start-DAW.cmd. Node.js 20+ is required; npm install is not needed to run the included dist folder. The launcher starts at http://localhost:5174 (or the next free port), and opens the browser only after the server is ready. Keep the server window open. This avoids accidentally opening an older DAW still running on port 5173.

## Current controls and behavior

- Tools opens a launcher with separate Audio Cleanup and Notepad windows. Notes are embedded only in project files and restored when the project opens. New projects start with a blank notepad. About is a separate main-menu item below Settings.
- Click outside a menu or dialog to dismiss it. Pending marker edits and deletion confirmations are cancelled; cleanup work is aborted and cancelled exports are discarded.
- The playlist starts with over five minutes of space and extends for clips, recording and markers. Alternating four-bar groups are shaded in every appearance theme, following tempo automation and the time signature.
- Drag the zoom percentage vertically or scroll over it. Double-click resets to 100%. Waveforms redraw at the selected zoom and render only the visible portion of long clips.
- Add the first marker from Playlist options. After that, double-click empty ruler or marker-lane space to add more. Drag unlocked markers to move them; use Lock marker in the marker editor to prevent movement. A single click seeks without starting playback. Double-click a marker to loop to the next marker (or the preceding interval for the last marker). Right-click to edit, lock/unlock or delete it. Locks are saved with the project.
- Save Project sits beside the project title. The first save uses the title; later saves use numbered copies such as SongTestV (1), SongTestV (2). The sequence is included in saved projects. Renaming starts a new sequence. New Project always offers Save, Start new without saving, and Cancel; cancelling a save keeps the current project open.
- Track dB values sit on the volume sliders. Track Controls and Mixer toggles stay in the bottom bar, and the upper-right fullscreen toggle enters or leaves browser fullscreen.
- Export audio offers Full song (including effect tails) or Highlighted playlist range (exact selection duration). Selected-range rendering includes earlier audio to preserve the effects state at its start. WAV, MP3 and aligned stems use the same range.
- A moved or resized clip takes priority over covered audio on the same track. Covered regions are trimmed or split, and Undo restores them. Explicit matching fade-out/fade-in overlaps remain available for crossfades. Existing overlapping projects use the same priority rules during playback and rendering.
- The waveform button beside the magnet opens fade/gain visibility, zero-crossing and stretch options. Fade/gain handles start hidden, zero-crossing starts enabled, and stretching starts disabled.
- Record arms capture; Play starts recording, optionally after the three-second count-in. A replacement take retains the previous audio for Undo. Solo is exclusive.
- Right-click supported volume, pan, tempo and effect controls for automation. Effect chains support name dragging, collapsed cards, insertion at the start or between effects, and confirmation before deleting customized effects.
- Settings includes eight appearance themes, panel height controls, keyboard controls and latency checks. Track Controls and Mixer share a dock by default. The optional visualizer rack supports level, VU, spectrum, stereo, oscilloscope and spectrogram modules.

Projects embed used audio, original takes and render sources, fades, clip gains, automation, markers, notes, grouping, routing, mixer settings and presets. Processing stays local. Older project files remain supported.

## Mixer, automation and tempo editing

+- Drag a visualizer's title to reorder it; the order is retained in this browser.
+- Panel Menu in the bottom bar offers Track Controls, Mixer, or both in a live browser window. The same menu flips their order or stacks the panels vertically (Mixer above Track Controls by default; Flip reverses it); the Stack action becomes Unstack while stacked; the bordered tooltip box remains at the left of the main dock and stays available when Track Controls closes while Mixer remains open. Drag the divider between panels to change their widths, or double-click it to reset. Closing the popup or choosing Dock panels restores the panels. Keep the main DAW window open; both windows share one audio engine and project. The browser must allow popups.
+- Notepad also opens directly from the bottom bar. Track-header dB readouts sit beside the horizontal slider; mixer dB readouts sit below the track title, above the fader.
+- Click an automation node without dragging to type its value in the compact value editor. Reset to knob value sets that point to the original underlying volume, pan, effect parameter or base BPM value. Drag it to preview the value in the tooltip box. A track's automation icon lists its active lanes. The waveform stays faintly visible beneath the lane. The BPM display rounds to a whole number while automation retains its full values.
+- Changing BPM or its automation renders audio to follow the beat grid, including changes within each clip. Channel effects menu → Time stretching chooses Resample (default, pitch follows speed) or Stretch (granular pitch preservation). Mode changes re-render from retained source audio. Tempo renders run in a worker and can take time on long sessions; playback pauses during rendering. Undo restores the prior tempo and clips. Stretch can color transients, especially at extreme ratios.
+- Click the color rectangle beside the title in Track settings to open its palette. Drag across the time ruler to scrub continuously when Loop is off; with Loop on, dragging selects a loop range.

## Panel layout settings

Settings → Panel heights defaults on and enables drag handles on expanded track rows and the top edge of Track Controls and Mixer. Reset beside the toggle restores default heights. Sizes and the toggle are retained in this browser. Side-by-side panels have one continuous height grip across the dock. Stacked panels have independent height grips. Double-click any resize grip to reset its height; resize grips do not display hover text.

Track settings has a scrolling body with Close pinned inside its footer; its color palette always opens to the right. Active automation shortcuts appear below the track settings button, with an Automations dropdown above Route to in Track settings. Empty, disabled and removed-effect lanes are omitted.

Mixer scale marks share the fader's linear-gain mapping, including the thumb inset. The popout starts wider (1280 pixels), keeps compact channel widths, and measures actual channel centers for its routing cables. Resize the popup for more fader space; excess channels scroll horizontally.

## Track activity and tooltip layout

Track headers and mixer channels use a single activity dot: green means enabled, grey means muted. Left-click toggles mute; right-click toggles exclusive solo. A soloed channel gets a ring and other channels dim. Soloing a muted channel enables it. Master right-click solos the full master mix or releases master solo.

When both lower panels close, the dock releases all its space to the playlist. In stacked mode, the upper panel spans the full width and the wider tooltip box occupies only the lower-left corner beside the lower panel. Click anywhere on the tooltip box's right edge to open or close it; its icon stays aligned with the channel-effects buttons.

## Header and fader appearance

The track activity dot sits at the lower-right corner. Automation appears immediately left of record selection; automation, record selection and track-settings actions share the same button size. The tooltip edge remains clickable without a hover highlight or divider.

Mixer channels are 84 pixels wide in the dock to fit independent left/right level bars. The volume fader, dB value and green activity dot are centered; a horizontal pan slider sits below the dot. Double-click the pan slider to center it, or right-click it for automation. A compact routing button opens a wider readable list of channel names. Cable positions follow the actual channel centers in either window.

Midnight mode follows Light mode and uses #000000 for its background and panel surfaces. Grey mode follows Midnight and uses a neutral light-leaning grey palette. All range sliders use slim rectangular fader handles, including vertical mixer faders; track-header pan controls remain knobs.

## Parallel mixer routing

The routing popup offers individual destination checkboxes. Route only sends the channel to the chosen destination. Track + Master additionally sends that channel's post-effects, post-volume and post-pan audio directly to Master. Choosing Master itself never creates a duplicate Master connection. The selected destinations are included in .bdaw files and applied to playback and renders; cables show both destinations. Muting the destination leaves the direct Master branch active; soloing a receiving channel suppresses the bypassing direct branch.

Mixer dB readouts use bold text. Midnight and neutral Grey appearances are available immediately after Light mode.

## Per-channel mixer settings

The settings icon below each mixer pan slider opens channel-specific controls: bypass all effects without deleting them, narrow Stereo to Mono, swap left/right outputs, and invert both channels' polarity. Stereo separation defaults to 0%; double-click its slider to restore the unchanged stereo signal. The left endpoint is shown as 100% Mono, and the right endpoint as 100% Stereo, over a -100 to +100 control range. Right-click the slider to automate separation. Mono uses the average of left and right. Width, swapping and polarity are processed after panning, before meters and routing, and affect playback, exports and frozen audio. Their defaults preserve the original signal. .bdaw files retain these settings; freeze/unfreeze preserves them without applying them twice.

## Multiple destinations and panel locking

Routing checkboxes can send a track to several tracks or buses at once. Click Only beside a destination for an exclusive route; this also disables the additional direct Master send. Select Master alongside other destinations to include a direct Master branch. Routes are embedded in .bdaw projects; playback, renders and mixer cables use the full routing graph. Feedback cycles and duplicate routes are rejected, destination deletion repairs remaining routes, and solo gates individual outgoing branches.

Below Stack/Unstack in Panel Menu, Lock Resizing / Unlock Resizing and Reset Panels share a row. Lock uses the same setting as Settings, disabling track-height, dock-height and panel-width grips. Resizing defaults unlocked. Reset Panels restores default heights and widths, side-by-side order, visible panels and tooltip, unlocked resizing, and docks any popped-out panels. The per-channel mixer settings remain available below the pan slider.

## Playback and mixer updates

Playback and recording leave ChannelSplitterNode configuration at its browser-supported defaults. Startup failures retain their actual error message rather than labelling successful microphone access as unavailable. Regression checks cover existing-clip playback and recording with a splitter that rejects unsupported channel interpretation changes.

Channel effects grey out when their mixer effects-bypass toggle is active. Power, swap-channel and polarity buttons include icons. Routing uses individual destination checks in a bounded scrolling menu; older projects with the extra Master flag display that output as a selected Master destination. Locking panel resizing preserves the divider spacing.

## Secret appearance and linked effects controls

Secret uses the Light palette with direct crops from the three supplied hand-drawn sheets. Only white-background removal, proportional resizing and transparent padding are applied; the original strokes are preserved. Shared menu, popout, arrow, microphone, settings, save, loop, fullscreen, notepad and close icons use these crops throughout the interface. Zoom, BPM, time signature and the playlist timer use the supplied digits, colon and percent drawings. Numeric typing remains native and editable. Crops and source-bound manifests are in src/assets/secret/. Pause retains its existing design because no Pause drawing was supplied.

The main Channel Effects power button and the selected channel's mixer effects switch share one per-channel bypass state. Opening mixer settings selects the linked channel so the effects rack reflects the same track. Legacy project-wide bypass is converted into equivalent per-channel states on opening an older project.

## Clip selection, recording and project statistics

- Native browser context menus are suppressed; DAW right-click actions still work.
- Ctrl/Cmd + drag across the playlist selects intersecting clips on multiple tracks. Drag a selected clip, gain handle or fade handle to edit the set together. Shift + drag keeps clips on their lanes; Shift + drag an empty lane places the primary selected clip on that lane.
- The Channel Effects menu is ordered Add effect, Save preset, Load preset, Reverse clip, Time stretching, Pitch. The -12 to +12 st pitch slider renders only the primary selected clip when released, preserves its duration, and supports undo.
- The microphone input meter sits beside the master level. It reads the recording input automatically; click it to enable or disable silent metering outside recording. It does not enable microphone monitoring.
- Quick Retake discards the latest completed take or the capture currently in progress, restores the audio underneath it, and starts another take on the same track at the same position. Existing count-in applies. Undo restores replaced audio.
- Track Settings includes Lock Track below Freeze. Locked tracks reject clip edits, moves, deletion, imports and recording. Snowflake and lock badges show frozen and locked states. Track duplicates use `Original title - Copy`.
- Tools > Statistics shows track count, per-track timeline duration, project duration, completed recording count, embedded audio bytes, estimated project file size, original creation date, cumulative open/work time, saves and copies. Work time excludes hidden-window time and idle time after one minute. These statistics persist inside the .bdaw file; older files without a creation date show Unknown.

## Development

Source is in src/; compiled application is in dist/.

    npm ci
    npm run dev
    npm run build
    npm test
    npm run test:ui

Automated checks cover project validation, editing, routing, fades, automation, cleanup DSP, latency analysis, recording replacement/undo, marker interaction, zoom, menu dismissal, notes save/restore and exact-range export. Browser appearance, microphone hardware and audible rendering still require manual validation.

Third-party licenses are in third-party-licenses/. MP3 encoding uses the locally bundled LAME build in wasm-media-encoders; no audio is uploaded.

## Demos

The empty playlist offers Demo 1 and Demo 2. Demo 1 synthesizes a 16-second groove locally, with Drums, Bass and Keys and light showcase effect chains. Demo 2 loads the project's supplied 48 kHz stereo WAV stems from public/demo2: Melody, 808 and Drums. Its 25.6-second arrangement uses 150 BPM and restrained EQ, compression, saturation and chorus. These are public demo assets served by the site; users' own project audio stays on their device. Demo 3 is absent, and demo choices remain outside the main menu.

## Main menu, exports and new effects

Main Menu Settings is ordered New Project, Open Project, Save Project, Save Project as..., Import, Export, then Tools, Settings and About. Import always creates a new audio track. Demo 1 and Demo 2 are available on the empty playlist. Demo 3 is removed.

Export supports any combination of WAV 16/24-bit PCM or 32-bit float, MP3 128/192/320 kbps, Ogg Vorbis with 128/192/320 kbps VBR targets, and FLAC 16/24-bit with compression levels 1–8. WAV 24-bit is selected by default. All output is 48 kHz stereo. Multiple versions or stems are bundled in a ZIP. The dialog shows size estimates; lossless compressed sizes depend on the audio. Export encoding runs locally in a module worker and can be cancelled. No codec is loaded from an external CDN.

Autotune follows the shared project Key & Scale selector, so changes from either selector update every autotune instance. Amount and Speed default to 100% and are automatable. It is a simple monophonic vocal corrector with a short processing delay (approximately 50 ms); it is not designed for chords or full mixes. Amount 0% is a dry bypass.

Parametric EQ has seven numbered bands with eight filter types (including Disabled), orders 1-10, frequency 20 Hz-20 kHz, gain +/-18 dB, and Q 0.1-18. Right-click a point to open its settings beside the widened graph. Its 35 parameters can be automated and saved. Band solo is a temporary audition, excluded from project files and exports. The background shows a live input spectrum during playback and a selected-clip spectrum when stopped. Frequency changes update the running graph with smoothing instead of restarting playback. The original three-band EQ remains available.

Additional effects: De-Esser (threshold, frequency, gain-reduction meter and removed-signal audition), Bitcrusher, Distortion (including saturation styles), Chorus, Flanger, Phaser, TR-1176, TR-2A, TR-ultec, and Clipper. Controls can be saved in projects/presets and sliders can be automated. De-esser audition is temporary and excluded from exports. TR-1176, TR-2A and TR-ultec are original lightweight FET/opto/passive-EQ-inspired browser algorithms, not calibrated replicas of hardware or third-party plugins.

Statistics UI refreshes every 15 seconds rather than rerendering the application every second. Time accounting is flushed on interaction and saving so the longer refresh does not discard elapsed work time.

Optional encoder integration check: `npm run test:codecs` (requires FFmpeg on PATH). This validates the actual encoded output, all FLAC compression levels, and browser-mode WASM initialization.


## Tabrec Studio ALPHA

The header and browser tab identify this build as ALPHA. The star logo and compact branding omit the top-bar tagline. Quick Save is beside Fullscreen; the microphone input meter and Retake sit above the tracks. Live track-header meter strips are removed; stereo mixer meters remain.

Save Project as... selects a destination folder in browsers supporting the File System Access directory picker. Further Quick Save copies use that folder during the current project session, skip existing filenames, and keep the numbered copy sequence. Cancel leaves the current project and destination unchanged. Browsers without directory access use their native Save dialog when available, or a regular download; automatic folder writes are unavailable there. Folder/file handles are never embedded in .bdaw files. New/Open clears the selected project folder.

Export offers one toggle per format, with a quality selector for each and a FLAC compression slider. WAV 24-bit remains the default; size estimates, output/stems and selection/full-song controls remain below.

De-Esser uses two side-by-side knobs. TR-1176 has Input, Attack, Release and Output knobs with Ratio below; TR-2A and TR-ultec also use knobs. Compressor gain-reduction meters are hidden. Parametric EQ is 15% narrower, labels the dragged point frequency and adds frequency grid labels. The effect picker is vertical, and chain insertion buttons expand in the small gaps on hover or keyboard focus. About includes inactive source-download/social placeholders, ready for future links.


## Effect picker, navigation and export guidance

Export opens with WAV 24-bit enabled and the other formats unchecked. Hover each format label or checkbox for its description and recommended use. Tools, Statistics and About use concise Close labels. Audio Cleanup and Statistics have a Back button to Tools; About returns to the main menu.

The effect picker opens above the dock, stays within the window and includes a searchable, scrolling list. EQ is named Three-Band EQ. Autotune, TR-ultec and De-Esser use compact controls that fit the default dock; their bodies scroll when the dock is shortened. Microphone input and Retake sit between editing and tempo controls, with a responsive layout at smaller widths.

Distortion includes a Saturation character (Tube, Tape, Diode) and a Distortion character (Overdrive, Fuzz, Exciting). Each style uses a distinct transfer curve; saturation styles use softer shaping and modest internal drive while distortion styles add stronger clipping or harmonics. Standalone Saturation is no longer offered in the picker, but existing projects/presets containing it remain supported.


## Toolbar and channel workspace controls

The transport uses bounded grid cells with equal-height capture controls and separate tempo/playback groups. Channel Effects Menu includes Close/Open All Effects Panel plus preset icons. Every Add Effect entry point opens the titled, searchable Effects Menu beside the clicked location, clamped to the viewport.

Drag the divider between track headers and the playlist to resize all headers horizontally (180-480 px). The Panel Menu resizing lock disables header resizing; double-click the divider to restore 240 px. Width preferences remain local to the workspace. The panel resizing lock also disables header resizing. Track buttons and volume faders adapt to the available width.

Mouse wheels pan the effect rack and mixer horizontally. Controls keep their normal interactions; shortened effect bodies retain vertical scrolling. Mixer gain/tick numbers are larger. Parametric EQ band settings have more spacing, Slope replaces Order / slope, and double-clicking Frequency/Q restores that band's default. During band solo the unmonitored sides and other band handles are dimmed. Distortion uses four compact knobs in a single row below its character/style selectors.


## Export worker and master automation update

FLAC assembly no longer imports the vendor CommonJS/AMD utility wrapper, preventing a runtime dynamic-require error when the production export worker loads. Native STREAMINFO assembly preserves the full 36-bit sample count, frame sizes and MD5. `npm run test:codecs` also exercises the built module worker in a browser-like runtime without Node globals and decodes every output with FFmpeg.

The transport uses a symmetric center column, a short master slider and responsive side groups. The main UI has small side margins. Mixer/effects wheel motion eases toward accumulated scroll targets, honors reduced motion, and yields to vertical scrolling in shortened effect panels. Reset Panels restores track-header width to 240 px; the old header lock button is removed, with locking controlled through Panel Menu.

Master volume and pan can be right-clicked to create a dedicated Master automation header above audio tracks, separate from BPM automation. Its selector switches between the two curves; both are saved and scheduled during playback/export, without consuming one of the sixteen audio tracks.

Tooltips move to a popout when all visible panels are detached; they stay on the main window when another panel remains there. Playlist Options and Panel Menu have titles. About includes an inactive Tabrec Studio Online placeholder. Parametric EQ Menu uses horizontal Slope, Frequency, Q and Gain knobs, with double-click resets and no footer under Solo audition.


## Expanded ALPHA controls and effects

The star logo has an outlined circular center. About includes the ALPHA warning, the online-version placeholder above GitHub, and Download Source / Coming Soon. Appearance labels are Dark Mode, Light Mode, Midnight Mode, Gray Mode, Lotus, Bamboo, Peacock and Doodle (WIP).

Save Project creates a browser download. Save Project as... chooses a folder in supporting browsers (or opens the native Save dialog as a fallback). Quick Save reuses a chosen folder during the session; before a folder is chosen it downloads a copy. Export Audio has a Back button. The new 100% zoom is 56 pixels/second, equivalent to the former 140%. New projects snap to quarter notes; projects without a stored grid setting retain sixteenth-note snapping on reopen.

Shortcuts: S slices the selected clip at the playhead; C toggles Loop; Left/Right move by one grid division; Ctrl/Cmd+mouse wheel zooms the timeline; Ctrl/Cmd+X deletes a selected clip without copying it. Typing and focused controls retain their native shortcuts. Loop boundaries have independent draggable handles, a ruler highlight and a distinct playhead arrow. Desktop audio drops onto an existing playlist lane import at that track/time. Track headers default to 80 px and include stereo level bars in the volume fader.

New effects are Vocal Doubler (modulated micro-delay), Vocoder (12 bands and internal saw carrier), Filter, Tuner (transparent analysis) and Autopan. Reverb has Room/Hall/Plate and independent Wet/Dry; Delay has Mono/Stereo/Pingpong and independent Wet/Dry. Native compressor controls are knobs with a live input/output waveform and threshold lines. Hardware-inspired TR panels use the reference layouts; TR-ultec uses staggered rows. Knob changes publish their values and percentages to the tooltip box.

All master controls, including master effect parameters, use the dedicated Master automation lane; its parameter selector switches curves without overlaying audio tracks. Existing reverb projects retain their previous dry balance when migrating to independent dry controls.
