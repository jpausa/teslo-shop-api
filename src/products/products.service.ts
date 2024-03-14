import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import { isUUID } from 'class-validator';
import { ProductImage } from './entities';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,

    private readonly configService: ConfigService,
  ) {}
  async create(createProductDto: CreateProductDto) {
    const { images = [], ...productDetails } = createProductDto;
    try {
      const product = this.productsRepository.create({
        ...productDetails,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
      });
      await this.productsRepository.save(product);
      return { ...product, images };
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    const products = await this.productsRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      },
    });
    return {
      limit,
      offset,
      data: products.map((product) => ({
        ...product,
        images: product.images.map(
          (image) =>
            `${this.configService.get<string>('hostApi')}/files/product/${image.url}`,
        ),
      })),
    };
  }

  async findOne(term: string) {
    let product: Product;

    if (isUUID(term)) {
      product = await this.productsRepository.findOneBy({ id: term });
    } else {
      const query = this.productsRepository.createQueryBuilder('product');
      product = await query
        .where(' UPPER(title) = :title or slug = :slug', {
          title: term.toUpperCase(),
          slug: term,
        })
        .leftJoinAndSelect('product.images', 'images')
        .getOne();
    }

    if (!product)
      throw new NotFoundException(`Product with id ${term} not found`);

    return {
      ...product,
      images: product.images.map(
        (image) =>
          `${this.configService.get<string>('hostApi')}/files/product/${image.url}`,
      ),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productsRepository.preload({
      id,
      ...toUpdate,
    });

    if (!product)
      throw new NotFoundException(`Product with id ${id} not found`);

    //create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });
        product.images = images.map((image) =>
          this.productImageRepository.create({ url: image }),
        );
      }

      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return { ...product, images };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    await this.productsRepository.delete(id);
  }

  async deleteAllProducts() {
    const query = this.productsRepository.createQueryBuilder('product');
    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException('Something went wrong');
  }
}
