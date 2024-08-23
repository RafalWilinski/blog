import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as Slider from '@radix-ui/react-slider';

const LLMParallelProcessing = () => {
  const [baseCost, setBaseCost] = useState(1);
  const [schemaCost, setSchemaCost] = useState(1);
  const [data, setData] = useState([]);

  useEffect(() => {
    const generateData = () => {
      const newData = [];
      for (let n = 1; n <= 16; n++) {
        const totalCost = baseCost + schemaCost * n;
        const speedup = (baseCost + schemaCost) / (baseCost + (schemaCost / n));
        const efficiency = speedup / totalCost;
        newData.push({
          subschemas: n,
          speedup: speedup,
          totalCost: totalCost,
          efficiency: efficiency
        });
      }
      setData(newData);
    };

    generateData();
  }, [baseCost, schemaCost]);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="mb-4">
        <label htmlFor="base-cost" className="block text-xs font-medium text-gray-400 mb-1">
          Base Cost (fixed overhead): {baseCost.toFixed(2)}
        </label>
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          defaultValue={[1]}
          max={5}
          min={0.1}
          step={0.1}
          onValueChange={(values) => setBaseCost(values[0])}
        >
          <Slider.Track className="bg-gray-200 relative grow rounded-full h-1">
            <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb 
            className="block w-5 h-5 bg-white shadow-lg rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Slider.Root>
        <p className="mt-1 text-xs text-gray-500">
          This represents the fixed cost of processing the prompt and input. It's non-reducible and applied to every request, regardless of parallelization.
        </p>
      </div>
      <div className="mb-4">
        <label htmlFor="schema-cost" className="block text-xs font-medium text-gray-400 mb-1">
          Schema Complexity Factor: {schemaCost.toFixed(2)}
        </label>
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          defaultValue={[1]}
          max={5}
          min={0.1}
          step={0.1}
          onValueChange={(values) => setSchemaCost(values[0])}
        >
          <Slider.Track className="bg-gray-200 relative grow rounded-full h-1">
            <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb 
            className="block w-5 h-5 bg-white shadow-lg rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Slider.Root>
        <p className="mt-1 text-xs text-gray-500">
          This factor represents the complexity of the schema. Higher values indicate a more complex schema that takes more time to process but can benefit more from parallelization.
        </p>
      </div>
      <ResponsiveContainer width="80%" height={400} style={{ margin: '0 auto' }}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="subschemas" 
            label={{ value: 'Number of Subschemas', position: 'insideBottom', offset: -5 }}
          />
          {/* <YAxis 
            yAxisId="left"
            label={{ value: 'Speedup / Total Cost', angle: -90, position: 'insideLeft' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            label={{ value: 'Efficiency', angle: 90, position: 'insideRight' }}
          /> */}
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="speedup" name="Speedup" stroke="#8884d8" />
          <Line yAxisId="left" type="monotone" dataKey="totalCost" name="Total Cost" stroke="#82ca9d" />
          <Line yAxisId="right" type="monotone" dataKey="efficiency" name="Efficiency" stroke="#ffc658" />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-4 text-xs text-gray-600">
        This graph illustrates LLM parallel processing with subschemas. The base cost is fixed for all requests,
        while the total schema processing cost increases with the number of subschemas. Adjust the sliders to see 
        how changing these factors affects speedup, total cost, and efficiency as parallelization increases.
      </p>
    </div>
  );
};

export default LLMParallelProcessing;