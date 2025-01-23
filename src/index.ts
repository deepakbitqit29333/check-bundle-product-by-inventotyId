import fetch from 'node-fetch';
import {SHOP_NAME, ACCESS_TOKEN, INVENTORY_IDS} from './Constants.ts';

const SHOPIFY_API_URL = `https://${SHOP_NAME}.myshopify.com/admin/api/2025-01/graphql.json`;

interface InventoryResponse {
  data: {
    inventoryItem: {
      variant: {
        inventoryQuantity: number;
        product: {
          id: string;
          hasVariantsThatRequiresComponents: boolean;
          bundleComponents: {
            nodes: Array<{
              quantity: number;
              componentProduct: {
                id: string;
              };
            }>;
          };
        };
      };
    };
  };
}

async function getInventory(inventoryId: number) {
  const query = `
    query getInventory($id: ID!) {
      inventoryItem(id: $id) {
        variant {
          inventoryQuantity
          product {
            id
            hasVariantsThatRequiresComponents
            bundleComponents(first: 10) {
              nodes {
                quantity
                componentProduct {
                  id
                }
              }
            }
          }
        }
      }
    }
  `;

  console.log(inventoryId)
  const variables = {id: `gid://shopify/InventoryItem/${inventoryId}`};

  const response = await fetch(SHOPIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({query, variables}),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: any = await response.json() as InventoryResponse;

  const product = result.data.inventoryItem.variant.product;

  // console.log('InventoryId:', inventoryId);
  // console.log('hasVariantsThatRequiresComponents:', product.hasVariantsThatRequiresComponents);
  if (!product.hasVariantsThatRequiresComponents) {
    throw new Error('Product does not have variants that require components.');
  }

  return result.data.inventoryItem;
}


// Example usage
const inventoryids = INVENTORY_IDS;
// console.log('InventoryIds:', inventoryids);

for (const inventoryId of inventoryids) {
  getInventory(inventoryId)
    .then(inventoryItem => {
      console.log('Inventory Item:', inventoryItem);
    })
    .catch(error => {
      console.error('Error:', error.message);
    });
  // break;
}
