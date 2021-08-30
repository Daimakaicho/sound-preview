'use strict';
const MODULE_ID = "audio-preview";

class AudioPreview {

    static PLAY_STATE = {
        INIT: 0,
        PLAYING: 1,
        WAITING: 2,
        LOADING: 3
    }

    constructor() {
        this._state = AudioPreview.PLAY_STATE.WAITING;
        this.selectedTrack = undefined;
        this.selectedSound = undefined;
    }

    _canPlayback(){
        return this.selectedTrack ? CONST.AUDIO_FILE_EXTENSIONS.includes(this.selectedTrack.split('.').pop().toLowerCase()) : false;
    }

    async _onPick(args) {
        const li = args[0].currentTarget;
        this.selectedTrack = li.dataset.path;
        this._applyState();
    }

    get state() {
        return this._state;
    }

    set state(value) {
        const stateApplied = this._applyState(value);
        if (stateApplied) {
            this._state = value;
        }
    }

    _applyState(value) {
        if (value === undefined) value = this.state;

        switch (value) {

            case AudioPreview.PLAY_STATE.WAITING:
                this._playButton.find("i")
                    .removeClass(["fa-spinner", "fa-spin", "fa-stop"])
                    .addClass(["fa-play"]);
                this._playButton.prop("disabled", !this._canPlayback());
                return true;

            case AudioPreview.PLAY_STATE.PLAYING:
                this._playButton.find("i")
                    .removeClass(["fa-spinner", "fa-spin", "fa-play"])
                    .addClass(["fa-stop"]);
                this._playButton.prop("disabled", false);
                return true;

            case AudioPreview.PLAY_STATE.LOADING:
                this._playButton.find("i")
                    .removeClass(["fa-play", "fa-stop"])
                    .addClass(["fa-spinner", "fa-spin"]);
                this._playButton.prop("disabled", true);
                return true;

            default: return false;
        }
    }

    async _onClick() {
        if (this.state === AudioPreview.PLAY_STATE.PLAYING) {
            this.selectedSound.stop();
            this.state = AudioPreview.PLAY_STATE.WAITING;
            return;
        }
        this.state = AudioPreview.PLAY_STATE.LOADING;
        this.selectedSound = await AudioHelper.play({
            src: this.selectedTrack,
            volume: game.settings.get(MODULE_ID, "AudioPreview.Volume"),
            loop: game.settings.get(MODULE_ID, "AudioPreview.LoopMode")
        }, false);
        this.selectedSound.on('end', () => this.state = AudioPreview.PLAY_STATE.WAITING);
        this.state = AudioPreview.PLAY_STATE.PLAYING;
    }

    async _activateListeners(button) {
        button.on('click', async (event) => {
            event.preventDefault();
            await this._onClick()
        });
    }

    async _onRenderFilePicker(app, html, data) {

        const playButton = $("<button>");
        playButton.append($("<i>").addClass("fas"));
        await this._activateListeners(playButton);
        this._playButton = playButton;
        this._applyState();

        html.find("footer.form-footer > .selected-file").append(playButton);
        playButton.css({
            "max-width": "30px",
            "margin-left": "5px"
        });
    }

}

Hooks.once('init', async () => {
    game.soundPreview = new AudioPreview();

    libWrapper.register(MODULE_ID, "FilePicker.prototype._onPick", async function (wrapper, ...args) {
        await wrapper(...args);
        await game.soundPreview._onPick(args);
    });

    Hooks.on('renderFilePicker', async (app, html, data) => {
        await game.soundPreview._onRenderFilePicker(app, html, data);
    });
    //await game.soundPreview.loadControls();
})

Hooks.once('ready', async () => {

    game.settings.register(MODULE_ID, "AudioPreview.Volume", {
        name: game.i18n.localize("AudioPreview.Settings.Volume.Title"),
        hint: game.i18n.localize("AudioPreview.Settings.Volume.Description"),
        scope: "world",
        config: true,
        default: 0.5,
        type: Number,
        range: {
            min: 0,
            max: 1,
            step: 0.05
        }
    });

    game.settings.register(MODULE_ID, "AudioPreview.LoopMode", {
        name: game.i18n.localize("AudioPreview.Settings.LoopMode.Title"),
        hint: game.i18n.localize("AudioPreview.Settings.LoopMode.Description"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });

})