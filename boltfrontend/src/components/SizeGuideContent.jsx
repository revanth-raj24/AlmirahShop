import sizeGuideData from '../data/sizeguide.json';

export default function SizeGuideContent({ showTitle = true }) {
  const { standard = [], tshirt = [], shoes = [] } = sizeGuideData;

  const renderTable = (columns, rows, fields) => (
    <div className="overflow-x-auto">
      <table className="w-full border border-neutral-200 text-sm">
        <thead className="bg-neutral-100 text-neutral-700 uppercase tracking-wide text-xs">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 text-left border-b border-neutral-200">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.size || row.us}-${index}`} className="odd:bg-white even:bg-neutral-50/60">
              {(fields || Object.keys(row)).map((field, idx) => (
                <td key={`${row.size || row.us}-${idx}`} className="px-4 py-3 border-b border-neutral-100 text-neutral-700">
                  {row[field]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-10">
      {showTitle && (
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-widest text-neutral-500">Find Your Fit</p>
          <h1 className="font-serif text-4xl text-neutral-900">Global Size Guide</h1>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Measurements are shown in inches and follow industry-standard sizing. For the best fit,
            measure over undergarments and keep the tape measure level.
          </p>
        </div>
      )}

      <section className="space-y-6">
        <h2 className="font-serif text-2xl text-neutral-900">Standard Apparel</h2>
        <p className="text-neutral-600 text-sm">Men, Women &amp; Unisex classics</p>
        <div className="grid gap-6 md:grid-cols-2">
          {standard.map((group) => (
            <div key={group.label} className="bg-white border border-neutral-200 shadow-sm">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h3 className="text-lg font-medium text-neutral-900">{group.label}</h3>
              </div>
              <div className="p-5">
                {renderTable(['Size', 'Chest', 'Waist', 'Hip'], group.rows, ['size', 'chest', 'waist', 'hip'])}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-serif text-2xl text-neutral-900">T-Shirt Measurements</h2>
        <p className="text-neutral-600 text-sm">Measured flat in inches</p>
        <div className="bg-white border border-neutral-200 shadow-sm p-5">
          {renderTable(['Size', 'Chest', 'Length', 'Shoulder', 'Sleeve'], tshirt, [
            'size',
            'chest',
            'length',
            'shoulder',
            'sleeve',
          ])}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-serif text-2xl text-neutral-900">Shoes Conversion</h2>
        <p className="text-neutral-600 text-sm">US / UK / EU / CM reference</p>
        <div className="bg-white border border-neutral-200 shadow-sm p-5">
          {renderTable(['US', 'UK', 'EU', 'CM'], shoes, ['us', 'uk', 'eu', 'cm'])}
        </div>
      </section>
    </div>
  );
}


