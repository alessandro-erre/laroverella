import { Ic, ICONS } from './icons'

// Due vie per la foto: rullino del telefono oppure scatto diretto dalla fotocamera.
export default function PhotoPicker({ onPick, allowVideo = false, compact = false }) {
  return (
    <div className="pick-row">
      <label className="pick">
        <Ic d={ICONS.leaf} size={compact ? 17 : 20} />
        {allowVideo ? 'Dal telefono' : 'Dal telefono'}
        <input type="file" accept={allowVideo ? 'image/*,video/*' : 'image/*'} hidden
          onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onPick(f) }} />
      </label>
      <label className="pick">
        <Ic d={ICONS.cam} size={compact ? 17 : 20} />
        Scatta foto
        <input type="file" accept="image/*" capture="environment" hidden
          onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onPick(f) }} />
      </label>
    </div>
  )
}
