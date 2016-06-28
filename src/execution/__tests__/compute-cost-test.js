/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { computeCost } from '../computeCost';
import { formatError } from '../../error';
import { parse } from '../../language';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLString,
} from '../../type';

describe('ComputeCost: Handles basic execution tasks', () => {
  it('compute cost of an arbitrary code', async () => {
    const doc = `
      query Example($size: Int) {
        a,
        b,
        x: c
        ...c
        f
        p: pic(size: $size)
        ...on DataType {
          pic(size: $size)
          promise {
            a
          }
        }
        deep {
          a
          b
          c
          deeper {
            a
            b
          }
        }
      }

      fragment c on DataType {
        d
        e
      }
    `;

    const ast = parse(doc);
    const expected = {
      cost: 1 + 2 + 3 + (4 + 5) + 6 + 100 + 7 + 8 + 20 + 10 * (1 + 2),
    };

    const DataType = new GraphQLObjectType({
      name: 'DataType',
      fields: () => ({
        a: { type: GraphQLString, cost: 1 },
        b: { type: GraphQLString, cost: 2 },
        c: { type: GraphQLString, cost: 3 },
        d: { type: GraphQLString, cost: 4 },
        e: { type: GraphQLString, cost: 5 },
        f: { type: GraphQLString, cost: 6 },
        pic: {
          args: { size: { type: GraphQLInt } },
          type: GraphQLString,
          cost: (obj, { size }) => size || 0,
          resolve: (obj, { size }) => obj.pic(size)
        },
        deep: { type: DeepDataType },
        promise: { type: DataType },
      })
    });

    const DeepDataType = new GraphQLObjectType({
      name: 'DeepDataType',
      fields: {
        a: { type: GraphQLString, cost: 7 },
        b: { type: GraphQLString, cost: 8 },
        c: { type: new GraphQLList(GraphQLString), cost: 20 },
        deeper: { type: new GraphQLList(DataType), cost: 10 },
      }
    });

    const schema = new GraphQLSchema({
      query: DataType
    });

    expect(
      await computeCost(schema, ast, null, null, { size: 100 }, 'Example')
    ).to.deep.equal(expected);
  });

});
