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

  console.log('InventoryId:', inventoryId);
  // console.log('hasVariantsThatRequiresComponents:', product.hasVariantsThatRequiresComponents);
  if (!product.hasVariantsThatRequiresComponents) {
    throw new Error('Product does not have variants that require components.');
  }

  return result.data.inventoryItem;
}

// Example usage
const inventoryids = INVENTORY_IDS;
// console.log('InventoryIds:', inventoryids);

// for (const inventoryId of inventoryids) {
//   getInventory(inventoryId)
//     .then(inventoryItem => {
//       console.log('Inventory Item:', inventoryItem);
//     })
//     .catch(error => {
//       console.error('Error:', error.message);
//     });
//   // break;
// }

let count = 1;

async function getVariantInventory(cursor?: string) {
  const query = `{
    productVariants(first:100, sortKey:ID ${cursor ? `, after:"${cursor}"` : ''}){
        nodes{
            id
            product{
                hasVariantsThatRequiresComponents
                id
            }

            inventoryItem{
                id
                inventoryLevels(first:10){
                            nodes{
                                quantities(names:["available"]) {
                                    id
                                    name
                                    quantity
                                }
                                location{
                                    name
                                }                        
                            }
                        }
            }   
          }
          pageInfo{
              hasNextPage
              endCursor
          }
        }  
  }`;

  const response = await fetch(SHOPIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({query, cursor}),
  });

  const result: any = await response.json();
  // console.log(result)
  // if(result.data?.errors){
  //   console.log(result.data)
  //   // throw new Error("there is issue with query")
  // }

  const variants = result.data.productVariants;
  console.log(`data fetched:- ${count}`)
  for (const variant of variants.nodes) {
    for (const inventoryLevel of variant.inventoryItem.inventoryLevels.nodes) {
      if (!inventoryLevel.quantities.length && !variant.product.hasVariantsThatRequiresComponents) {
        console.log(variant.product.id)
        throw new Error("there is issue with inventory")
      }

      if (!inventoryLevel.quantities.length && variant.product.hasVariantsThatRequiresComponents) {
        // console.log("inventoryLevel.quantities",inventoryLevel.quantities)
        // console.log("variant.product.hasVariantsThatRequiresComponents",variant.product.hasVariantsThatRequiresComponents);
        // console.log("variant.product.id",variant.product.id);
      }

    }
  }

  console.log(`Batch completed ${count++}`);

  if (variants.pageInfo.hasNextPage) {
    console.log(`fetching next page ${count}`)
    console.log(`end cursor ${variants.pageInfo.endCursor}`)
    await getVariantInventory(variants.pageInfo.endCursor)
  }

}

getVariantInventory().then((data) => {
  console.log("script completed")
})
