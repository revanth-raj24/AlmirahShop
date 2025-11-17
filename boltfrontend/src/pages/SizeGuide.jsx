import SizeGuideContent from '../components/SizeGuideContent';

export default function SizeGuide() {
  return (
    <div className="bg-neutral-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Sizing Reference</p>
          <h1 className="font-serif text-4xl md:text-5xl text-neutral-900">Universal Size Guide</h1>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Designed for apparel and footwear across The Almirah Shop. These measurements follow our
            in-house fit blocks so you can shop with confidence. If you are between sizes, we
            recommend sizing up for relaxed fits.
          </p>
        </div>

        <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-8 space-y-10">
          <SizeGuideContent />
        </div>

        <div className="bg-neutral-900 text-neutral-50 rounded-xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="font-serif text-2xl mb-2">How to Measure</h2>
            <p className="text-neutral-100/80 text-sm">
              Use a soft measuring tape and keep it parallel to the floor. Measure over lightweight
              clothing for the most accurate results.
            </p>
          </div>
          <ul className="text-sm text-neutral-50/90 space-y-2">
            <li><strong>Chest:</strong> Measure under arms at the fullest part of the bust.</li>
            <li><strong>Waist:</strong> Measure around natural waistline, keeping tape comfortably loose.</li>
            <li><strong>Hip:</strong> Measure around the fullest part of the hip.</li>
            <li><strong>Shoulder:</strong> Measure from tip of one shoulder to the other.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


